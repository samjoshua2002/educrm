const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/organization/settings/courses/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Replace the TabsList and the start of the TabsContent for 'courses' up to the table
const tabsListRegex = /<TabsList className="bg-\[#fafafa\].*?<\/TabsList>/s;
content = content.replace(tabsListRegex, `
          <div className="border border-[#e5e5e5] rounded-[12px] bg-white shadow-sm flex flex-col w-full max-w-full overflow-hidden">
            {/* Unified Top Header for Tabs and Search/Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border-b border-[#e2e8f0] gap-4">
              <TabsList className="bg-transparent border-0 p-0 h-auto flex gap-6 w-full lg:w-auto overflow-x-auto justify-start rounded-none">
                <TabsTrigger
                  value="courses"
                  className={cn(
                    "p-0 h-auto bg-transparent border-0 rounded-none text-sm font-semibold transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "text-slate-500 hover:text-slate-800",
                    "data-[state=active]:text-[#1e3a8a] data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a8a] pb-2"
                  )}
                >
                  Courses
                </TabsTrigger>
                <TabsTrigger
                  value="sessions"
                  className={cn(
                    "p-0 h-auto bg-transparent border-0 rounded-none text-sm font-semibold transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "text-slate-500 hover:text-slate-800",
                    "data-[state=active]:text-[#1e3a8a] data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a8a] pb-2"
                  )}
                >
                  Academic Sessions
                </TabsTrigger>
                <TabsTrigger
                  value="course-sessions"
                  className={cn(
                    "p-0 h-auto bg-transparent border-0 rounded-none text-sm font-semibold transition-colors cursor-pointer shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    "text-slate-500 hover:text-slate-800",
                    "data-[state=active]:text-[#1e3a8a] data-[state=active]:border-b-2 data-[state=active]:border-[#1e3a8a] pb-2"
                  )}
                >
                  Course Sessions
                </TabsTrigger>
              </TabsList>

              {/* Dynamic Search & Filters Area */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {activeTab === "courses" && (
                  <>
                    <div className="relative w-full sm:w-[300px]">
                      <Input
                        placeholder="Search by name, email or phone..."
                        className="w-full pr-10 h-10 border-[#e2e8f0] rounded-[8px]"
                        value={coursesSearch}
                        onChange={(e) => {
                          setCoursesSearch(e.target.value);
                          setCoursesPage(1);
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        <Search className="size-4" />
                      </div>
                    </div>
                    <Select
                      value={coursesStatus}
                      onValueChange={(val) => {
                        setCoursesStatus(val);
                        setCoursesPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Status: All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All Statuses</SelectItem>
                        <SelectItem value="Active">Status: Active</SelectItem>
                        <SelectItem value="Inactive">Status: Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {activeTab === "sessions" && (
                  <>
                    <div className="relative w-full sm:w-[300px]">
                      <Input
                        placeholder="Search by name, email or phone..."
                        className="w-full pr-10 h-10 border-[#e2e8f0] rounded-[8px]"
                        value={sessionsSearch}
                        onChange={(e) => {
                          setSessionsSearch(e.target.value);
                          setSessionsPage(1);
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        <Search className="size-4" />
                      </div>
                    </div>
                    <Select
                      value={sessionsStatus}
                      onValueChange={(val) => {
                        setSessionsStatus(val);
                        setSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[180px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Status: All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All Statuses</SelectItem>
                        <SelectItem value="Active">Status: Active</SelectItem>
                        <SelectItem value="Inactive">Status: Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
                {activeTab === "course-sessions" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-[200px]">
                      <Input
                        placeholder="Search by name, email..."
                        className="w-full pr-10 h-10 border-[#e2e8f0] rounded-[8px]"
                        value={courseSessionsSearch}
                        onChange={(e) => {
                          setCourseSessionsSearch(e.target.value);
                          setCourseSessionsPage(1);
                        }}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
                        <Search className="size-4" />
                      </div>
                    </div>
                    <Select
                      value={filterCourseId}
                      onValueChange={(val) => {
                        setFilterCourseId(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Course: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Course: All</SelectItem>
                        {allCoursesDropdown?.data?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            Course: {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filterSessionId}
                      onValueChange={(val) => {
                        setFilterSessionId(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Session: All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Session: All</SelectItem>
                        {allSessionsDropdown?.data?.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            Session: {s.displayName || s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={courseSessionsStatus}
                      onValueChange={(val) => {
                        setCourseSessionsStatus(val);
                        setCourseSessionsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] h-10 text-sm bg-slate-50 border-[#e2e8f0] rounded-[8px]">
                        <SelectValue placeholder="Status: All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All Statuses</SelectItem>
                        <SelectItem value="Active">Status: Active</SelectItem>
                        <SelectItem value="Inactive">Status: Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
`);

// 2. Remove the old Search and Filters from each TabsContent, and remove the outer card wrapper from the table
// For Courses:
const coursesOldFiltersRegex = /<TabsContent value="courses" className="flex flex-col gap-4 outline-none">.*?<div className="hidden lg:block border border-\[#e5e5e5\] rounded-\[12px\] bg-white overflow-hidden shadow-\[0px_1px_2px_0px_rgba\(0,0,0,0\.05\)\]">/s;
content = content.replace(coursesOldFiltersRegex, `<TabsContent value="courses" className="m-0 border-0 outline-none">
            <div className="hidden lg:block w-full">`);

// For Sessions:
const sessionsOldFiltersRegex = /<TabsContent value="sessions" className="flex flex-col gap-4 outline-none">.*?<div className="hidden lg:block border border-\[#e5e5e5\] rounded-\[12px\] bg-white overflow-hidden shadow-\[0px_1px_2px_0px_rgba\(0,0,0,0\.05\)\]">/s;
content = content.replace(sessionsOldFiltersRegex, `<TabsContent value="sessions" className="m-0 border-0 outline-none">
            <div className="hidden lg:block w-full">`);

// For Course Sessions:
const courseSessionsOldFiltersRegex = /<TabsContent\s+value="course-sessions"\s+className="flex flex-col gap-4 outline-none"\s*>.*?<div className="hidden lg:block border border-\[#e5e5e5\] rounded-\[12px\] bg-white overflow-hidden shadow-\[0px_1px_2px_0px_rgba\(0,0,0,0\.05\)\]">/s;
content = content.replace(courseSessionsOldFiltersRegex, `<TabsContent value="course-sessions" className="m-0 border-0 outline-none">
            <div className="hidden lg:block w-full">`);

// 3. We also need to close the massive new wrapper div after the Tabs contents.
// Let's insert </div> just before </Tabs>
content = content.replace(/<\/Tabs>/, '  </div>\n        </Tabs>');

// Change <Tabs ... className="w-full flex flex-col gap-4"> to remove gap-4
content = content.replace(/className="w-full flex flex-col gap-4"/, 'className="w-full flex flex-col"');

fs.writeFileSync(filePath, content, 'utf8');
console.log("File updated successfully.");
