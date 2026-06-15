import { Modal } from 'antd'
import type { FormInstance } from 'antd/es/form'
import type { ReactNode } from 'react'

interface ModalFormProps {
  open: boolean
  title: string
  width?: number | string
  loading?: boolean
  formInstance?: FormInstance
  onCancel: () => void
  destroyOnHidden?: boolean
  children: ReactNode
}

function ModalForm({
  open,
  title,
  width = 720,
  loading = false,
  formInstance,
  onCancel,
  destroyOnHidden = true,
  children,
}: ModalFormProps) {
  const handleOk = () => {
    if (formInstance) {
      formInstance.submit()
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      width={width}
      onCancel={onCancel}
      destroyOnHidden={destroyOnHidden}
      confirmLoading={loading}
      onOk={handleOk}
      okText="确定"
      cancelText="取消"
    >
      {children}
    </Modal>
  )
}

export default ModalForm
