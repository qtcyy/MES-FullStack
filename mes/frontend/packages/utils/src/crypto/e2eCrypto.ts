/**
 * E2E Crypto Service
 *
 * End-to-end encryption primitives built on the Web Crypto API.
 *
 * Algorithms used (matching the backend API contract):
 *   - Key exchange:  ECDH  P-256
 *   - Key derivation: HKDF  SHA-256  (salt = sessionId, info = "chat-session")
 *   - Symmetric:     AES-GCM-256
 *   - Escrow wrap:   RSA-OAEP  SHA-256
 *
 * Fallback: When crypto.subtle is unavailable (HTTP non-secure context),
 * automatically falls back to pure-JS implementations via @noble/* libraries.
 * The output format is identical — messages encrypted by native or fallback
 * are cross-compatible.
 */

import { p256 } from "@noble/curves/nist.js";
import { gcm } from "@noble/ciphers/aes.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const HAS_SUBTLE =
  typeof globalThis.crypto !== "undefined" &&
  typeof globalThis.crypto.subtle !== "undefined";

if (!HAS_SUBTLE) {
  console.warn(
    "[E2EE] crypto.subtle 不可用（非安全上下文）。已降级为纯 JS 加密实现。" +
      "建议部署 HTTPS 以获得最佳安全性。",
  );
}

// ---------------------------------------------------------------------------
// SessionKey — opaque handle for derived AES-GCM-256 key
//
// In secure contexts (HTTPS) this is a native CryptoKey.
// In HTTP fallback mode it wraps raw key bytes from @noble/hashes HKDF.
// ---------------------------------------------------------------------------

class FallbackSessionKey {
  constructor(public readonly raw: Uint8Array) {}
}

/**
 * Opaque session key handle — passed into encrypt / decrypt.
 * Consumers should treat this as opaque; never inspect internals.
 */
export type SessionKey = CryptoKey | FallbackSessionKey;

// ---------------------------------------------------------------------------
// Base64 <-> ArrayBuffer / Uint8Array helpers
// ---------------------------------------------------------------------------

function base64ToBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64ToUint8(b64: string): Uint8Array {
  return new Uint8Array(base64ToBuffer(b64));
}

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Safe for sliced Uint8Arrays (ignores underlying buffer offset). */
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ---------------------------------------------------------------------------
// P-256 ASN.1 DER helpers — fixed headers for SPKI / PKCS8
//
// These are constant for P-256 and can be hardcoded safely.
// ---------------------------------------------------------------------------

/** 26-byte SPKI header for an uncompressed P-256 EC public key. */
const P256_SPKI_HEADER = new Uint8Array([
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
  0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
  0x42, 0x00,
]);

function rawPublicKeyToSpki(raw65: Uint8Array): Uint8Array {
  const spki = new Uint8Array(26 + raw65.length);
  spki.set(P256_SPKI_HEADER);
  spki.set(raw65, 26);
  return spki;
}

function spkiToRawPublicKey(spki: Uint8Array): Uint8Array {
  return spki.slice(26); // 65 bytes: 04 || x || y
}

/** 36-byte PKCS8 header (everything before the 32-byte private key). */
const P256_PKCS8_HEADER = new Uint8Array([
  0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
  0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
  0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
]);

/** 5-byte wrapper between private key and public key in PKCS8. */
const P256_PKCS8_PUBKEY_WRAPPER = new Uint8Array([
  0xa1, 0x44, 0x03, 0x42, 0x00,
]);

function rawKeysToPkcs8(privKey32: Uint8Array, pubKey65: Uint8Array): Uint8Array {
  // Total: 36 (header) + 32 (privKey) + 5 (wrapper) + 65 (pubKey) = 138
  const pkcs8 = new Uint8Array(138);
  let offset = 0;
  pkcs8.set(P256_PKCS8_HEADER, offset);
  offset += P256_PKCS8_HEADER.length;
  pkcs8.set(privKey32, offset);
  offset += 32;
  pkcs8.set(P256_PKCS8_PUBKEY_WRAPPER, offset);
  offset += P256_PKCS8_PUBKEY_WRAPPER.length;
  pkcs8.set(pubKey65, offset);
  return pkcs8;
}

function pkcs8ToRawPrivateKey(pkcs8: Uint8Array): Uint8Array {
  return pkcs8.slice(36, 68); // 32-byte raw private key
}

// ---------------------------------------------------------------------------
// E2ECryptoService
// ---------------------------------------------------------------------------

export class E2ECryptoService {
  /**
   * Generate an ephemeral ECDH key-pair (P-256).
   * Both keys are returned as Base64-encoded SPKI / PKCS8.
   */
  async generateECDHKeyPair(): Promise<{
    publicKey: string;
    privateKey: string;
  }> {
    if (HAS_SUBTLE) {
      const keyPair = await crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveBits"],
      );

      const publicKey = bufferToBase64(
        await crypto.subtle.exportKey("spki", keyPair.publicKey),
      );
      const privateKey = bufferToBase64(
        await crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
      );

      return { publicKey, privateKey };
    }

    // Fallback: @noble/curves
    const { secretKey } = p256.keygen();
    const rawPub = p256.getPublicKey(secretKey, false); // 65 bytes uncompressed
    return {
      publicKey: uint8ToBase64(rawPublicKeyToSpki(rawPub)),
      privateKey: uint8ToBase64(rawKeysToPkcs8(secretKey, rawPub)),
    };
  }

  /**
   * Derive a symmetric AES-GCM-256 session key from an ECDH shared secret.
   *
   * Steps:
   *   1. Import the local ECDH private key and peer public key.
   *   2. Compute the ECDH shared secret (256 bits).
   *   3. Feed the shared secret into HKDF(SHA-256) with
   *      salt = sessionId and info = "chat-session".
   *   4. Derive a 256-bit key for AES-GCM.
   */
  async deriveSessionKey(
    myPrivateKeyB64: string,
    peerPublicKeyB64: string,
    sessionId: string,
  ): Promise<SessionKey> {
    if (HAS_SUBTLE) {
      const ecdhPrivateKey = await crypto.subtle.importKey(
        "pkcs8",
        base64ToBuffer(myPrivateKeyB64),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveBits"],
      );

      const peerPublicKey = await crypto.subtle.importKey(
        "spki",
        base64ToBuffer(peerPublicKeyB64),
        { name: "ECDH", namedCurve: "P-256" },
        false,
        [],
      );

      const sharedBits = await crypto.subtle.deriveBits(
        { name: "ECDH", public: peerPublicKey },
        ecdhPrivateKey,
        256,
      );

      const hkdfKey = await crypto.subtle.importKey(
        "raw",
        sharedBits,
        "HKDF",
        false,
        ["deriveKey"],
      );

      return crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new TextEncoder().encode(sessionId),
          info: new TextEncoder().encode("chat-session"),
        },
        hkdfKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );
    }

    // Fallback: @noble/*
    const privRaw = pkcs8ToRawPrivateKey(base64ToUint8(myPrivateKeyB64));
    const pubRaw = spkiToRawPublicKey(base64ToUint8(peerPublicKeyB64));

    // ECDH: compressed shared point → x-coordinate (bytes 1..33 = 32 bytes)
    const shared = p256.getSharedSecret(privRaw, pubRaw);
    const xCoord = shared.slice(1, 33);

    // HKDF(SHA-256, ikm=x, salt=sessionId, info="chat-session", dkLen=32)
    const derived = hkdf(
      sha256,
      xCoord,
      new TextEncoder().encode(sessionId),
      new TextEncoder().encode("chat-session"),
      32,
    );
    return new FallbackSessionKey(derived);
  }

  /**
   * Encrypt a plaintext string with AES-GCM-256.
   * Returns the ciphertext and a fresh 96-bit IV, both Base64-encoded.
   */
  async encrypt(
    sessionKey: SessionKey,
    plaintext: string,
  ): Promise<{ ciphertext: string; iv: string }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    if (sessionKey instanceof FallbackSessionKey) {
      const encrypted = gcm(sessionKey.raw, iv).encrypt(encoded);
      return {
        ciphertext: uint8ToBase64(encrypted),
        iv: uint8ToBase64(iv),
      };
    }

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      sessionKey,
      encoded,
    );
    return {
      ciphertext: bufferToBase64(encrypted),
      iv: bufferToBase64(iv.buffer),
    };
  }

  /**
   * Decrypt an AES-GCM-256 ciphertext back to a plaintext string.
   */
  async decrypt(
    sessionKey: SessionKey,
    ciphertextB64: string,
    ivB64: string,
  ): Promise<string> {
    if (sessionKey instanceof FallbackSessionKey) {
      const decrypted = gcm(
        sessionKey.raw,
        base64ToUint8(ivB64),
      ).decrypt(base64ToUint8(ciphertextB64));
      return new TextDecoder().decode(decrypted);
    }

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBuffer(ivB64) },
      sessionKey,
      base64ToBuffer(ciphertextB64),
    );
    return new TextDecoder().decode(decrypted);
  }

  /**
   * Wrap (encrypt) an ECDH private key under the escrow RSA public key
   * so it can be stored server-side for key recovery.
   *
   * Note: RSA operations require crypto.subtle (HTTPS only).
   */
  async encryptPrivateKeyForEscrow(
    ecdhPrivateKeyB64: string,
    escrowRSAPublicKey: CryptoKey,
  ): Promise<string> {
    if (!HAS_SUBTLE) {
      throw new Error("RSA escrow 需要安全上下文（HTTPS）");
    }
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      escrowRSAPublicKey,
      base64ToBuffer(ecdhPrivateKeyB64),
    );
    return bufferToBase64(encrypted);
  }

  /**
   * Unwrap an escrowed ECDH private key using the escrow RSA private key.
   * Returns the ECDH private key as Base64-encoded PKCS8.
   *
   * Note: RSA operations require crypto.subtle (HTTPS only).
   */
  async decryptEscrowedPrivateKey(
    encryptedPrivKeyB64: string,
    escrowRSAPrivateKey: CryptoKey,
  ): Promise<string> {
    if (!HAS_SUBTLE) {
      throw new Error("RSA escrow 需要安全上下文（HTTPS）");
    }
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      escrowRSAPrivateKey,
      base64ToBuffer(encryptedPrivKeyB64),
    );
    return bufferToBase64(decrypted);
  }

  /**
   * Import an RSA private key from a PEM string (PKCS8, RSA-OAEP / SHA-256).
   * Useful for server-side escrow key recovery in admin tooling.
   *
   * Note: RSA operations require crypto.subtle (HTTPS only).
   */
  async importRSAPrivateKeyFromPEM(pem: string): Promise<CryptoKey> {
    if (!HAS_SUBTLE) {
      throw new Error("RSA 操作需要安全上下文（HTTPS）");
    }
    const b64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/g, "")
      .replace(/-----END PRIVATE KEY-----/g, "")
      .replace(/\s/g, "");

    return crypto.subtle.importKey(
      "pkcs8",
      base64ToBuffer(b64),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["decrypt"],
    );
  }
}

/** Singleton instance for convenience. */
export const e2eCrypto = new E2ECryptoService();
