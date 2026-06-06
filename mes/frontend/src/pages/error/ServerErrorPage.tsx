import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

export default function ServerErrorPage() {
  const navigate = useNavigate()

  return (
    <Result
      status="500"
      title="500"
      subTitle="服务器内部错误，请联系管理员"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回首页
        </Button>
      }
    />
  )
}
