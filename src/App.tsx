
import { Routes, Route } from 'react-router-dom'
import ZeflashLanding from './components/ZeflashLanding'
import ChargingStations from './components/ChargingStations'
import BatteryReport from './components/BatteryReport'
import AIReport from './components/AIReport'

function App() {
  return (
    <Routes>
      <Route path="/" element={<ZeflashLanding />} />
      <Route path="/stations" element={<ChargingStations />} />
      <Route path="/report/:deviceId" element={<BatteryReport />} />
      <Route path="/report/:deviceId/ai" element={<AIReport />} />
    </Routes>
  )
}

export default App