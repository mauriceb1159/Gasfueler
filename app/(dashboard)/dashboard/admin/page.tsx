import { Metadata } from 'next';
import { Users, Settings, BarChart3, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin Dashboard'
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Users className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Settings className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">System Health</div>
          <div className="text-lg font-bold text-green-600">Normal</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <BarChart3 className="h-6 w-6 text-green-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Sessions</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <AlertCircle className="h-6 w-6 text-yellow-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Alerts</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">System Administration</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">User Management</h3>
            <p className="text-sm text-gray-500 mt-1">Manage all users and roles</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">System Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure system parameters</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Reports & Logs</h3>
            <p className="text-sm text-gray-500 mt-1">View system logs and reports</p>
          </a>
          <a href="#" className="p-4 border rounded-lg hover:bg-gray-50">
            <h3 className="font-semibold">Security</h3>
            <p className="text-sm text-gray-500 mt-1">Manage security settings</p>
          </a>
        </div>
      </div>
    </div>
  );
}
