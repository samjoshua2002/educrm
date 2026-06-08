export default function OrganizationSettingsPage() {
  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p>
          Manage your organization&apos;s profile, gateway configuration, and
          regional setup.
        </p>
      </div>
    </>
  );
}
