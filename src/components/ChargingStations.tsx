import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowLeft, BarChart3, Zap, Clock, CheckCircle, Users } from 'lucide-react';
import Papa from 'papaparse';

type CsvRow = {
  'S.No'?: string;
  'Station ID'?: string;
  'Station Name'?: string;
  'EVSE ID'?: string;
  'Address'?: string;
  'City'?: string;
  'State'?: string;
  'Latitude'?: string | number;
  'Longitude'?: string | number;
  'Station Status'?: string;
  'EVSE Status'?: string;
  'Protocol'?: string;
  'Coordinates'?: string;
  'Map Link'?: string;
};

type Evse = {
  evseId: string;
  status: string;
  protocol?: string;
};

type Station = {
  id: string; // Station ID
  name: string; // Station Name
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  stationStatus: string;
  evses: Evse[];
};

const ChargingStations: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Online' | 'Offline'>('All');
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    const csvPath = '/device_locations_api - Stations.csv';
    const url = encodeURI(csvPath);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const result = Papa.parse<CsvRow>(text, {
          header: true,
          skipEmptyLines: true,
        });

        const rows: CsvRow[] = (result.data || []).filter((r) => r['Station ID'] && r['EVSE ID']);

        const byStation = new Map<string, Station>();
        for (const row of rows) {
          const stationId = String(row['Station ID']!).trim();
          const name = String(row['Station Name'] || '').trim();
          const address = String(row['Address'] || '').trim();
          const city = String(row['City'] || '').trim();
          const state = String(row['State'] || '').trim();

          const coords = String(row['Coordinates'] || '').split(',');
          const latStr = row['Latitude'] !== undefined && row['Latitude'] !== '' ? String(row['Latitude']) : (coords[0] ? coords[0].trim() : '');
          const lngStr = row['Longitude'] !== undefined && row['Longitude'] !== '' ? String(row['Longitude']) : (coords[1] ? coords[1].trim() : '');
          const lat = Number(latStr);
          const lng = Number(lngStr);

          const stationStatus = String(row['Station Status'] || '').trim();
          const evseId = String(row['EVSE ID'] || '').trim();
          const evseStatus = String(row['EVSE Status'] || '').trim();
          const protocol = String(row['Protocol'] || '').trim();

          if (!byStation.has(stationId)) {
            byStation.set(stationId, {
              id: stationId,
              name: name || 'Unknown Station',
              address,
              city,
              state,
              latitude: isNaN(lat) ? 0 : lat,
              longitude: isNaN(lng) ? 0 : lng,
              stationStatus: stationStatus || 'Unknown',
              evses: [],
            });
          }

          const st = byStation.get(stationId)!;
          if (evseId && !st.evses.find((e) => e.evseId === evseId)) {
            st.evses.push({ evseId, status: evseStatus || 'Unknown', protocol });
          }
        }

        const cityOrder = (s: Station) => {
          const city = s.city.toLowerCase();
          const state = s.state.toLowerCase();
          if (city.includes('delhi') || state.includes('delhi')) return 0; // Delhi first
          if (city.includes('chandigarh') || state.includes('chandigarh')) return 1; // Chandigarh second
          if (state.includes('uttarakhand') || state.includes('uttrakhand') || city.includes('dehradun')) return 2; // Uttarakhand third
          return 3; // Others
        };

        const grouped = Array.from(byStation.values()).sort((a, b) => {
          const pa = cityOrder(a);
          const pb = cityOrder(b);
          if (pa !== pb) return pa - pb;
          const c = a.city.localeCompare(b.city);
          return c !== 0 ? c : a.name.localeCompare(b.name);
        });
        setStations(grouped);
      })
      .catch((err) => {
        console.error(err);
        setStations([]);
      });
  }, []);

  const filteredStations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return stations.filter((station) => {
      const matchesSearch =
        !term ||
        station.name.toLowerCase().includes(term) ||
        station.city.toLowerCase().includes(term) ||
        station.address.toLowerCase().includes(term);

      const hasAvailable = station.evses.some((e) => e.status.toLowerCase() === 'available');
      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Online' && hasAvailable) ||
        (filterStatus === 'Offline' && !hasAvailable);

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus, stations]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-blue-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                title="Back to home"
              >
                <ArrowLeft className="w-5 h-5 text-blue-700" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-base">⚡</span>
                </div>
                <h1 className="text-2xl font-extrabold text-blue-900 tracking-tight">Zeflash</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">Find Your Charging Station</h2>
          <p className="text-gray-600 text-lg sm:text-xl max-w-2xl">Get instant access to Zeflash-enabled EV charging stations near you. Book your rapid battery test in minutes.</p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-blue-700">Online Stations</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-blue-900">{
              stations.filter((s) => s.evses.some((e) => e.status.toLowerCase() === 'available')).length
            }</p>
            <p className="text-xs text-blue-600 mt-1">Ready to serve you</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-cyan-700">Test Duration</h3>
              <Clock className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-extrabold text-cyan-900">20 min</p>
            <p className="text-xs text-cyan-600 mt-1">Quick & accurate</p>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-teal-700">Accuracy</h3>
              <CheckCircle className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-3xl font-extrabold text-teal-900">90%+</p>
            <p className="text-xs text-teal-600 mt-1">Highly reliable</p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="sticky top-20 z-30 bg-white/95 backdrop-blur rounded-2xl shadow-lg p-6 mb-12 border border-blue-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-1/2">
            <Search className="absolute left-3 top-3 w-5 h-5 text-blue-400" />
            <input
              type="text"
              placeholder="Search by station name or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['All', 'Online', 'Offline'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                aria-pressed={filterStatus === status}
                className={`px-4 py-2 rounded-full font-medium transition-colors border text-sm ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 font-semibold md:ml-4">
            <span className="text-blue-700">{filteredStations.length}</span> of <span className="text-blue-700">{stations.length}</span>
          </div>
        </div>

        {/* Stations Grid */}
        {filteredStations.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {filteredStations.map((station) => (
                <div
                  key={station.id}
                  className="bg-white rounded-2xl border-2 border-blue-100 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all duration-300 overflow-hidden flex flex-col min-h-[280px] group"
                >
                  {/* Status Badge */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

                  {/* Content */}
                  <div className="p-6 pt-5 flex-1 flex flex-col">
                    {/* Station Name (location louder than device id) */}
                    <div className="mb-2.5">
                      <h3 className="font-bold text-lg text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
                        {station.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" />
                        <span className="truncate">{station.city}{station.city && station.state ? ', ' : ''}{station.state}</span>
                      </div>
                      {station.latitude && station.longitude ? (
                        <div className="mt-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-blue-300 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            Open in Google Maps
                          </a>
                        </div>
                      ) : null}
                    </div>

                    {/* Features */}
                    <div className="space-y-1.5 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>20-minute rapid test</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span>Instant health report</span>
                      </div>
                    </div>

                    {/* Chargers at this station */}
                    <div className="mt-2 space-y-3 border-t border-blue-100 pt-3">
                      {station.evses.map((e, idx) => (
                        <div
                          key={e.evseId || idx}
                          className="rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-4 w-full overflow-hidden"
                        >
                          {/* Charger header */}
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                              e.status.toLowerCase() === 'available'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                                : e.status.toLowerCase() === 'in use'
                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-extrabold text-gray-900">Charger {idx + 1}</p>
                              <p className="text-[12px] text-gray-600 truncate">EVSE ID: {e.evseId}</p>
                              <p className="text-[11px] text-gray-500">Status: {e.status}{e.protocol ? ` • ${e.protocol}` : ''}</p>
                            </div>
                          </div>

                          {/* Ports list */}
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[1, 2, 3].map((port) => (
                              <div
                                key={`${e.evseId}-port-${port}`}
                                className="flex flex-col gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 overflow-hidden"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    e.status.toLowerCase() === 'available'
                                      ? 'bg-green-500'
                                      : e.status.toLowerCase() === 'in use'
                                      ? 'bg-amber-500'
                                      : 'bg-blue-400'
                                  }`} />
                                  <p className="text-sm font-semibold text-gray-900 truncate">Port {port}</p>
                                  <p className="text-[11px] text-gray-500 hidden sm:block">• {e.protocol || 'ocpp1.6'}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-blue-300 text-blue-700 bg-white opacity-60 cursor-not-allowed w-full"
                                  aria-disabled="true"
                                >
                                  <Zap className="w-3 h-3" />
                                  View report
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Why Choose Zeflash?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Ultra-Fast Testing</h4>
                    <p className="text-gray-600 text-sm">Get comprehensive battery diagnostics in just 20 minutes at any fast charger.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Detailed Reports</h4>
                    <p className="text-gray-600 text-sm">Receive instant health insights including SoP, SoF, and efficiency metrics.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Lab-Grade Accuracy</h4>
                    <p className="text-gray-600 text-sm">Over 90% accuracy using advanced AI and physics-based diagnostics.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">Trusted by Thousands</h4>
                    <p className="text-gray-600 text-sm">Join thousands of EV owners making informed decisions about their vehicles.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl shadow-lg p-16 text-center border-2 border-blue-200">
            <Search className="w-16 h-16 text-blue-200 mx-auto mb-4" />
            <p className="text-blue-700 text-xl font-bold mb-2">No stations found</p>
            <p className="text-blue-600 text-base">Try adjusting your search terms or filters to find available stations.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChargingStations;
