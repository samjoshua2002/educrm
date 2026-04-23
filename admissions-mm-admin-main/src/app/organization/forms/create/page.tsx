"use client";

import * as React from "react";
import {
  ChevronLeft,
  FilePlus2,
  LayoutTemplate,
  CheckCircle2,
  Search,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormTemplates, useCreateForm, useUpdateForm } from "@/hooks/use-forms";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizationCreateFormPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");

  // API Hooks
  const { data: templatesResponse, isLoading: isLoadingTemplates } = useFormTemplates();
  const { mutateAsync: createForm, isPending: isCreating } = useCreateForm();
  const { mutateAsync: updateForm, isPending: isUpdating } = useUpdateForm();

  const templates = templatesResponse?.data || [];

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = async (templateId?: string) => {
    try {
      const templates = templatesResponse?.data || [];
      const template = templates.find(t => t.id === templateId);
      const name = template ? `${template.name}` : "Untitled Form";
      
      // 1. Create the basic form
      const newForm = await createForm({ 
        name,
        slug: name.toLowerCase().trim().replace(/\s+/g, '-') + '-' + Math.floor(Math.random() * 1000)
      });

      // 2. If template selected, update with template fields
      if (template && template.fields.length > 0) {
        await updateForm({
          id: newForm.id,
          data: { fields: template.fields }
        });
      }

      toast.success("Form initialized successfully");
      router.push(`/organization/forms/${newForm.id}/edit`);
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  return (
    <>
      {/* Header — matches team page style */}
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <div className="flex items-center gap-3">
          <Link href="/organization/forms">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-semibold">Choose a Template</h1>
        </div>
      </div>

      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-5xl mx-auto w-full">
        {/* Intro */}
        <div className="text-center space-y-3 max-w-xl mx-auto pt-4">
          <h2 className="text-2xl font-bold tracking-tight">What are you building today?</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Select a pre-built template to save time, or start with a blank form to build a unique experience for your institute.
          </p>
          <div className="relative max-w-sm mx-auto pt-2">
            <Search className="absolute left-3 top-5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search templates..." 
              className="pl-9" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Blank Option */}
          <div 
            onClick={() => !(isCreating || isUpdating) && handleSelectTemplate()} 
            className={`group block h-full ${isCreating || isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <Card className="border hover:border-primary transition-colors h-full">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full">
                <div className="h-12 w-12 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                  <FilePlus2 className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="font-semibold text-sm">Blank Form</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">Start from scratch with a clean slate.</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {isCreating ? 'Creating...' : 'Create Blank'} <ArrowRight className="h-3 w-3" />
                </div>
              </CardContent>
            </Card>
          </div>

          {isLoadingTemplates ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-full">
                <CardContent className="p-6 flex flex-col items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredTemplates.map((template) => (
              <div 
                key={template.id} 
                onClick={() => !(isCreating || isUpdating) && handleSelectTemplate(template.id)} 
                className={`group block h-full ${isCreating || isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Card className="border hover:border-primary transition-colors h-full">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-4 h-full">
                    <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center">
                      <LayoutTemplate className="h-6 w-6" />
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <h3 className="font-semibold text-sm">{template.name}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Ready-to-use fields for {template.name.toLowerCase()}.</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      {(isCreating || isUpdating) ? 'Initializing...' : 'Use Template'} <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t pt-6 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            All forms are mobile-responsive and include SSL security.
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Import from JSON</Button>
            <Button variant="outline">See Community Templates</Button>
          </div>
        </div>
      </div>
    </>
  );
}
