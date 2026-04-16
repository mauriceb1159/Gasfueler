import { Metadata } from 'next';
import { Users, Settings, BarChart3, AlertCircle, Lock, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Super Admin Dashboard'
};

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
          Master Access
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <Users className="h-6 w-6 text-orange-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Total Users</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <Zap className="h-6 w-6 text-yellow-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">System Status</div>
          <div className="text-lg font-bold text-green-600">Operational</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Active Sessions</div>
          <div className="text-3xl font-bold">0</div>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <AlertCircle className="h-6 w-6 text-red-600 mb-2" />
          <div className="text-sm font-medium text-gray-500">Critical Alerts</div>
          <div className="text-3xl font-bold">0</div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-xl font-semibold mb-4">Master Control Panel</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <a href="#" className="p-4 border border-red-200 rounded-lg hover:bg-red-50">
            <Lock className="h-6 w-6 text-red-600 mb-2" />
            <h3 className="font-semibold">User Administration</h3>
            <p className="text-sm text-gray-500 mt-1">Full control over all users</p>
          </a>
          <a href="#" className="p-4 border border-purple-200 rounded-lg hover:bg-purple-50">
            <Zap className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-semibold">System Configuration</h3>
            <p className="text-sm text-gray-500 mt-1">Configure all system settings</p>
          </a>
          <a href="#" className="p-4 border border-blue-200 rounded-lg hover:bg-blue-50">
            <BarChart3 className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-semibold">Global Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">Full system analytics</p>
          </a>
          <a href="#" className="p-4 border border-yellow-200 rounded-lg hover:bg-yellow-50">
            <AlertCircle className="h-6 w-6 text-yellow-600 mb-2" />
            <h3 className="font-semibold">Audit Logs</h3>
            <p className="text-sm text-gray-500 mt-1">System-wide activity logs</p>
          </a>
          <a href="#" className="p-4 border border-green-200 rounded-lg hover:bg-green-50">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-semibold">Role Management</h3>
            <p className="text-sm text-gray-500 mt-1">Define roles and permissions</p>
          </a>
          <a href="#" className="p-4 border border-pink-200 rounded-lg hover:bg-pink-50">
            <Settings className="h-6 w-6 text-pink-600 mb-2" />
            <h3 className="font-semibold">Security Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Master security controls</p>
          </a>
        </div>
      </div>
    </div>
  );
}
