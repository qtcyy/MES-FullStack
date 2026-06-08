import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Checkbox, message } from 'antd'
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons'
import useAuthStore from '@/stores/authStore'
import CaptchaImage from './CaptchaImage'

interface LoginForm {
  username: string
  password: string
  captcha: string
  rememberMe: boolean
}

function LoginPage() {
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      await login(
        values.username,
        values.password,
        values.captcha,
        values.rememberMe,
      )
      void message.success('登录成功')
      navigate('/', { replace: true })
    } catch {
      // Error message is already shown by the axios interceptor.
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 40%, #e0e7ff 70%, #c7d2fe 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative floating orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-8%',
          right: '-4%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.2), transparent 70%)',
          animation: 'float 7s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-3%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(37, 99, 235, 0.15), transparent 70%)',
          animation: 'float 8s ease-in-out infinite 1s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '45%',
          right: '8%',
          width: 140,
          height: 140,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(96, 165, 250, 0.18), transparent 70%)',
          animation: 'float 6s ease-in-out infinite 0.5s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(147, 197, 253, 0.16), transparent 70%)',
          animation: 'float 6.5s ease-in-out infinite 2s',
        }}
      />

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Glass card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: 420,
          maxWidth: '90vw',
          background: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          borderRadius: 20,
          padding: '40px 40px 32px',
          boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
          animation: 'fadeInUp 0.6s ease-out',
        }}
      >
        {/* Brand area */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 24,
              color: '#fff',
            }}
          >
            ⚙
          </div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#1e3a5f',
              margin: '0 0 6px',
            }}
          >
            章鱼师兄
          </h1>
          <p
            style={{
              color: 'rgba(59, 130, 246, 0.7)',
              fontSize: 13,
              margin: 0,
            }}
          >
            MES 智能制造系统
          </p>
        </div>

        <Form<LoginForm>
          name="login"
          onFinish={onFinish}
          initialValues={{ rememberMe: true }}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#3b82f6' }} />}
              placeholder="请输入用户名"
              autoComplete="username"
              style={{
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.04)',
                borderColor: 'rgba(59, 130, 246, 0.12)',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#3b82f6' }} />}
              placeholder="请输入密码"
              autoComplete="current-password"
              style={{
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.04)',
                borderColor: 'rgba(59, 130, 246, 0.12)',
              }}
            />
          </Form.Item>

          <Form.Item
            name="captcha"
            rules={[{ required: true, message: '请输入验证码' }]}
          >
            <Input
              prefix={<SafetyOutlined style={{ color: '#3b82f6' }} />}
              placeholder="请输入验证码"
              suffix={<CaptchaImage />}
              style={{
                borderRadius: 10,
                background: 'rgba(59, 130, 246, 0.04)',
                borderColor: 'rgba(59, 130, 246, 0.12)',
              }}
            />
          </Form.Item>

          <Form.Item>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}

export default LoginPage
