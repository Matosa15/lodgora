import React, { useState } from 'react';

export default function LodgoraDashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState(false);

  // New task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    room: '101',
    assignee: 'Ana Silva',
    priority: 'Normal',
    description: ''
  });

  // Example rooms data for Northbridge Hotel (Lisbon)
  const [rooms, setRooms] = useState([
    { id: 1, number: '101', type: 'Deluxe Queen', status: 'Ready', staff: 'Ana S.', note: 'Cleaned at 08:30 AM' },
    { id: 2, number: '102', type: 'Standard Twin', status: 'Cleaning', staff: 'Maria R.', note: 'In progress (Deep clean)' },
    { id: 3, number: '103', type: 'Executive Suite', status: 'Occupied', staff: 'Guest in-house', note: 'Checkout tomorrow' },
    { id: 4, number: '104', type: 'Deluxe King', status: 'Awaiting inspection', staff: 'Carlos M.', note: 'Pending floor manager check' },
    { id: 5, number: '105', type: 'Standard Single', status: 'Ready', staff: 'Ana S.', note: 'Ready for check-in' },
    { id: 6, number: '106', type: 'Accessible Suite', status: 'Out of service', staff: 'Maintenance', note: 'Plumbing repair ongoing' },
    { id: 7, number: '108', type: 'Standard Twin', status: 'Cleaning', staff: 'Maria R.', note: 'Change of linens requested' },
    { id: 8, number: '118', type: 'Deluxe Queen', status: 'Occupied', staff: 'Guest in-house', note: 'Do not disturb until 2 PM' },
    { id: 9, number: '201', type: 'Executive Suite', status: 'Cleaning', staff: 'Sofia L.', note: 'Bathroom refresh' },
    { id: 10, number: '202', type: 'Deluxe King', status: 'Ready', staff: 'Ana S.', note: 'Inspected & Approved' },
    { id: 11, number: '203', type: 'Standard Twin', status: 'Occupied', staff: 'Guest in-house', note: 'Extended stay' },
    { id: 12, number: '204', type: 'Deluxe Queen', status: 'Awaiting inspection', staff: 'Carlos M.', note: 'Awaiting supervisor sign-off' },
  ]);

  const [attentionItems, setAttentionItems] = useState([
    { id: 1, type: 'Inspection', title: 'Room 104 awaiting supervisor sign-off', time: '12m ago', priority: 'medium' },
    { id: 2, type: 'Maintenance', title: 'Bathroom leak reported in Room 103', time: '34m ago', priority: 'urgent' },
    { id: 3, type: 'Housekeeping', title: 'Overdue cleaning in Room 201', time: '1h ago', priority: 'high' },
    { id: 4, type: 'Maintenance', title: 'AC unit filter check in Room 106', time: '2h ago', priority: 'normal' },
  ]);

  const staffList = [
    { name: 'Ana Silva', role: 'Head Housekeeper', status: 'On Duty', assigned: 'Floor 1 (Rooms 101-108)' },
    { name: 'Maria Rodrigues', role: 'Room Attendant', status: 'On Duty', assigned: 'Floor 1 & 2' },
    { name: 'Carlos Mendes', role: 'Inspector', status: 'On Duty', assigned: 'All Floors' },
    { name: 'João Pereira', role: 'Maintenance Tech', status: 'On Call', assigned: 'Technical / Plumbing' }
  ];

  // Filter rooms based on search and status
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.number.includes(searchTerm) || room.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'All' || room.status.toLowerCase() === selectedStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ready':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>;
      case 'Cleaning':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">Cleaning</span>;
      case 'Occupied':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">Occupied</span>;
      case 'Awaiting inspection':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">Awaiting inspection</span>;
      case 'Out of service':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200">Out of service</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const handleCreateTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.title) return;
    
    const newAttention = {
      id: Date.now(),
      type: taskForm.priority === 'Urgent' ? 'Maintenance' : 'Housekeeping',
      title: `${taskForm.title} (Room ${taskForm.room})`,
      time: 'Just now',
      priority: taskForm.priority.toLowerCase()
    };

    setAttentionItems([newAttention, ...attentionItems]);
    setTaskSuccess(true);
    setTimeout(() => {
      setTaskSuccess(false);
      setIsTaskModalOpen(false);
      setTaskForm({ title: '', room: '101', assignee: 'Ana Silva', priority: 'Normal', description: '' });
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-[#F5F7FA] font-sans text-slate-800 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#172B4D] flex items-center justify-center text-white font-bold text-lg">
              L
            </div>
            <span className="font-bold text-xl tracking-tight text-[#172B4D]">Lodgora</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Main</p>
            <nav className="space-y-1">
              {[
                { name: 'Dashboard', icon: '📊' },
                { name: 'Rooms', icon: '🛏️', badge: '48' },
                { name: 'Tasks', icon: '📋', badge: '12' },
                { name: 'Housekeeping', icon: '🧹', badge: '8' },
                { name: 'Inspections', icon: '🔍', badge: '2' },
                { name: 'Maintenance', icon: '🔧', badge: '3' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.name
                      ? 'bg-[#172B4D] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      activeTab === item.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Management</p>
            <nav className="space-y-1">
              {[
                { name: 'Team', icon: '👥' },
                { name: 'Reports', icon: '📈' },
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === item.name ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Settings</p>
            <button
              onClick={() => setActiveTab('Settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'Settings' ? 'bg-[#172B4D] text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>⚙️</span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-[#172B4D]">Northbridge Hotel</p>
            <p className="text-xs text-slate-500 mt-0.5">Lisbon, Portugal • 48 rooms</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* TOP NAVIGATION */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">Northbridge Hotel</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold text-[#172B4D]">{activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search rooms, staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-9 pr-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-[#19A7A1] transition-all"
              />
            </div>

            {/* Notifications Button */}
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 relative"
              >
                🔔
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 py-3 z-50">
                  <div className="px-4 pb-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="font-semibold text-sm text-[#172B4D]">Notifications</span>
                    <span className="text-xs text-[#19A7A1] font-medium cursor-pointer">Mark all as read</span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {attentionItems.map((item, idx) => (
                      <div key={idx} className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-xs">
                        <p className="font-medium text-slate-800">{item.title}</p>
                        <p className="text-slate-400 mt-0.5">{item.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Create Task Button */}
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="bg-[#19A7A1] hover:bg-[#158f8b] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <span>+</span> Create task
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-[#172B4D] text-white font-medium flex items-center justify-center text-sm">
                SF
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-slate-800">Sofia Ferreira</p>
                <p className="text-[11px] text-slate-500">General Manager</p>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8">
          
          {/* Page Greeting */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#172B4D]">Good morning, Sofia</h1>
              <p className="text-slate-500 text-sm mt-1">Here is your hotel's operational overview for today.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 shadow-sm flex items-center gap-2">
                <span>📅</span> Today: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {[
              { label: 'Rooms ready', count: '24', total: '/ 48', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: '✅' },
              { label: 'Cleaning pending', count: '8', total: 'rooms', color: 'text-blue-600', bg: 'bg-blue-50', icon: '🧹' },
              { label: 'Active tasks', count: '12', total: 'pending', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: '📋' },
              { label: 'Open maintenance', count: '3', total: 'issues', color: 'text-rose-600', bg: 'bg-rose-50', icon: '🔧' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#172B4D]">{stat.count}</span>
                    <span className="text-xs text-slate-400">{stat.total}</span>
                  </div>
                </div>
                <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center text-lg`}>
                  {stat.icon}
                </div>
              </div>
            ))}
          </div>

          {/* GRID SECTION: Rooms Readiness & Needs Attention */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* ROOM READINESS SECTION (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#172B4D]">Room Readiness</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time status of housekeeping & guest rooms</p>
                  </div>
                  
                  {/* Status Filter Tabs */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
                    {['All', 'Ready', 'Cleaning', 'Occupied', 'Awaiting inspection', 'Out of service'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          selectedStatus === status ? 'bg-white text-[#172B4D] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredRooms.map((room) => (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-base font-bold text-[#172B4D]">Room {room.number}</span>
                          <p className="text-xs text-slate-500">{room.type}</p>
                        </div>
                        {getStatusBadge(room.status)}
                      </div>
                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                        <span>Staff: {room.staff}</span>
                        <span className="text-slate-400 truncate max-w-[110px]">{room.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TODAY'S ACTIVITY TIMELINE */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-[#172B4D] mb-4">Today's Activity</h2>
                <div className="space-y-4">
                  {[
                    { time: '09:45 AM', text: 'Room 102 checked as Cleaning in progress by Maria R.', tag: 'Housekeeping' },
                    { time: '09:30 AM', text: 'Maintenance ticket opened for Room 103 (Bathroom leak)', tag: 'Urgent' },
                    { time: '08:50 AM', text: 'Room 202 inspected and marked as Ready by Carlos M.', tag: 'Inspection' },
                    { time: '08:15 AM', text: 'Shift handover completed for morning housekeeping team', tag: 'Team' },
                  ].map((act, i) => (
                    <div key={i} className="flex items-start gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                      <span className="text-xs font-semibold text-slate-400 w-20 pt-0.5">{act.time}</span>
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 font-medium">{act.text}</p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">{act.tag}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SIDE PANELS (Needs Attention & Team Overview) */}
            <div className="space-y-6">
              
              {/* NEEDS ATTENTION PANEL */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#172B4D]">Needs attention</h2>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">4 pending</span>
                </div>
                
                <div className="space-y-3">
                  {attentionItems.map((item) => (
                    <div key={item.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          item.priority === 'urgent' ? 'text-rose-600' : item.priority === 'high' ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {item.type} • {item.priority}
                        </span>
                        <span className="text-[11px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TEAM OVERVIEW PANEL */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-[#172B4D]">Team on duty</h2>
                  <span className="text-xs text-slate-400">4 active</span>
                </div>

                <div className="space-y-3">
                  {staffList.map((staff, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-[#172B4D] font-bold text-xs flex items-center justify-center">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{staff.name}</p>
                          <p className="text-[11px] text-slate-500">{staff.role}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                        {staff.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </main>
      </div>

      {/* ROOM DETAIL MODAL */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-[#172B4D]">Room {selectedRoom.number}</h3>
                <p className="text-xs text-slate-500">{selectedRoom.type}</p>
              </div>
              <button 
                onClick={() => setSelectedRoom(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="py-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Current Status:</span>
                {getStatusBadge(selectedRoom.status)}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Assigned Staff:</span>
                <span className="text-xs font-semibold text-slate-800">{selectedRoom.staff}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Latest Note:</span>
                <span className="text-xs text-slate-800">{selectedRoom.note}</span>
              </div>

              <div className="pt-2">
                <label className="text-xs font-semibold text-slate-600 block mb-2">Quick Status Update:</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Ready', 'Cleaning', 'Occupied'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setRooms(rooms.map(r => r.id === selectedRoom.id ? { ...r, status: st } : r));
                        setSelectedRoom({ ...selectedRoom, status: st });
                      }}
                      className={`py-2 text-xs font-medium rounded-lg border transition-all ${
                        selectedRoom.status === st ? 'bg-[#172B4D] text-white border-[#172B4D]' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="bg-[#172B4D] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#12223a]"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-[#172B4D]">Create Operational Task</h3>
              <button 
                onClick={() => setIsTaskModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {taskSuccess ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">✓</div>
                <p className="font-bold text-[#172B4D]">Task Created Successfully!</p>
                <p className="text-xs text-slate-500 mt-1">Assigned to team queue.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateTaskSubmit} className="py-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Task Title / Issue</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Replace lightbulb or extra towels"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#19A7A1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Room Number</label>
                    <select
                      value={taskForm.room}
                      onChange={(e) => setTaskForm({ ...taskForm, room: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#19A7A1] bg-white"
                    >
                      {rooms.map(r => (
                        <option key={r.number} value={r.number}>Room {r.number}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#19A7A1] bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
                  <select
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#19A7A1] bg-white"
                  >
                    {staffList.map(s => (
                      <option key={s.name} value={s.name}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#19A7A1] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#158f8b]"
                  >
                    Save Task
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
