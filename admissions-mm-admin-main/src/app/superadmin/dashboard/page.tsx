export default function SuperadminDashboardPage() {
  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Superadmin Dashboard</h1>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p>Welcome to the Superadmin Dashboard. Here you can monitor all organizations and platform metrics.</p>
      </div>
    </>
  );
}
