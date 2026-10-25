import { Route, Routes } from 'react-router-dom';
import AdminLayout from './components/AdminLayout.jsx';
import Footer from './components/Footer.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import BookRoom from './pages/BookRoom.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import MyBookings from './pages/MyBookings.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import Rooms from './pages/Rooms.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import ManageBookings from './pages/admin/ManageBookings.jsx';
import ManageRooms from './pages/admin/ManageRooms.jsx';
import ManageUsers from './pages/admin/ManageUsers.jsx';
import Payments from './pages/admin/Payments.jsx';

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rooms/:id/book" element={<ProtectedRoute><BookRoom /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute roles={['admin', 'staff']}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="bookings" element={<ManageBookings />} />
            <Route path="rooms" element={<ManageRooms />} />
            <Route path="payments" element={<Payments />} />
            <Route path="users" element={<ProtectedRoute roles={['admin']}><ManageUsers /></ProtectedRoute>} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
