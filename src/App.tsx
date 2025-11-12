import { Routes, Route } from 'react-router-dom'
import ZeflashLanding from './components/ZeflashLanding'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ZeflashLanding />} />
    </Routes>
  )
}

export default App