
import { Routes, Route } from 'react-router-dom'
import ZeflashLanding from './components/ZeflashLanding'
import ChargingStations from './components/ChargingStations'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ZeflashLanding />} />
      <Route path="/stations" element={<ChargingStations />} />
    </Routes>
  )
}

export default App