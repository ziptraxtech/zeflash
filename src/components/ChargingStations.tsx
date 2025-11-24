import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, ArrowLeft, BarChart3, Zap, Clock, CheckCircle, Users } from 'lucide-react';

interface Station {
  id: number;
  name: string;
  location: string;
  status: 'Offline' | 'Good' | 'Excellent';
  monthlyCost: string;
  lastUpdate: string;
  color: 'red' | 'green';
}

const ChargingStations: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Online' | 'Offline'>('All');

  const stations: Station[] = [
    {
      id: 1,
      name: 'Device 1',
      location: 'Andheria More',
      status: 'Offline',
      monthlyCost: 'N/A',
      lastUpdate: 'Offline',
      color: 'red',
    },
    {
      id: 2,
      name: 'Device 2',
      location: 'Hauz Khas Telephone Centre',
      status: 'Good',
      monthlyCost: '₹250',
      lastUpdate: '2 min ago',
      color: 'green',
    },
    {
      id: 3,
      name: 'Device 3',
      location: 'Qutub Minar',
      status: 'Excellent',
      monthlyCost: '₹180',
      lastUpdate: '1 min ago',
      color: 'green',
    },
    {
      id: 4,
      name: 'Device 4',
      location: 'TB Hospital',
      status: 'Offline',
      monthlyCost: 'N/A',
      lastUpdate: 'Offline',
      color: 'red',
    },
    {
      id: 5,
      name: 'Device 5',
      location: 'Hauz Khas Metro Station',
      status: 'Offline',
      monthlyCost: 'N/A',
      lastUpdate: 'Offline',
      color: 'red',
    },
    {
      id: 6,
      name: 'Device 6',
      location: 'RK Puram Sector 5',
      status: 'Good',
      monthlyCost: '₹320',
      lastUpdate: '3 min ago',
      color: 'green',
    },
    {
      id: 7,
      name: 'Device 7',
      location: 'IIT',
      status: 'Excellent',
      monthlyCost: '₹150',
      lastUpdate: '2 min ago',
      color: 'green',
    },
    {
      id: 8,
      name: 'Device 8',
      location: 'Pascheel Park',
      status: 'Good',
      monthlyCost: '₹290',
      lastUpdate: '1 min ago',
      color: 'green',
    },
  ];

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      const matchesSearch =
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === 'All' ||
        (filterStatus === 'Online' && station.color === 'green') ||
        (filterStatus === 'Offline' && station.color === 'red');

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, filterStatus]);

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
            <div className="text-xs sm:text-sm text-gray-500 font-medium">Last updated: 3:01:09 PM</div>
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
              <h3 className="text-sm font-semibold text-blue-700">Available Stations</h3>
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-3xl font-extrabold text-blue-900">5</p>
            <p className="text-xs text-blue-600 mt-1">Ready to serve you</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-cyan-700">Test Duration</h3>
              <Clock className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-3xl font-extrabold text-cyan-900">15 min</p>
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
                className={`px-5 py-2 rounded-xl font-semibold transition-all border text-base shadow-sm ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-600 shadow-lg scale-105'
                    : 'bg-gray-50 text-blue-700 border-blue-200 hover:bg-blue-50'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
              {filteredStations.map((station) => (
                <div
                  key={station.id}
                  className="bg-white rounded-2xl border-2 border-blue-100 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all duration-300 overflow-hidden flex flex-col min-h-[280px] group"
                >
                  {/* Status Badge */}
                  <div className="h-1.5 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    {/* Station Name */}
                    <div className="mb-4">
                      <h3 className="font-bold text-xl text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{station.name}</h3>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-2 mb-6">
                      <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 font-medium leading-relaxed">{station.location}</p>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>15-minute rapid test</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span>Instant health report</span>
                      </div>
                    </div>

                    {/* Book Now Button */}
                    <button
                      className="w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-base bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 hover:shadow-lg transform hover:scale-105 active:scale-95"
                    >
                      <Zap className="w-4 h-4" />
                      Book Now
                    </button>
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
                    <p className="text-gray-600 text-sm">Get comprehensive battery diagnostics in just 15 minutes at any fast charger.</p>
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
