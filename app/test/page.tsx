export default function TestPage() {
  return (
    <div style={{ padding: '50px', fontSize: '24px' }}>
      <h1>TEST PAGE - If you see this, the server works!</h1>
      <p>Time: {new Date().toISOString()}</p>
    </div>
  )
}
