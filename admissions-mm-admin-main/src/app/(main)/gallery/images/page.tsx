"use client";

import * as React from "react";

import {
  Image as ImageIcon,
  EllipsisVertical,
  Pencil,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type GalleryImage = {
  id: number;
  name: string;
  status: "active" | "inactive";
  category: string;
  imageUrl: string;
};

const images: GalleryImage[] = [
  {
    id: 1,
    name: "Campus Orientation",
    status: "active",
    category: "Events",
    imageUrl:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=160&h=160&q=80",
  },
  {
    id: 2,
    name: "Library Renovation",
    status: "inactive",
    category: "Campus",
    imageUrl:
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=160&h=160&q=80",
  },
  {
    id: 3,
    name: "Science Fair",
    status: "active",
    category: "Academics",
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=160&h=160&q=80",
  },
  {
    id: 4,
    name: "Sports Day",
    status: "inactive",
    category: "Sports",
    imageUrl:
      "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=160&h=160&q=80",
  },
];

function StatusBadge({ status }: { status: GalleryImage["status"] }) {
  const isActive = status === "active";

  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
          : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-400"
      }
    >
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}

export default function GalleryImagesPage() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(images.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImages = images.slice(startIndex, endIndex);

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Gallery Images</h1>
        <Button>
          <Plus className="size-4 mr-2" />
          Add Image
        </Button>
      </div>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="ps-4">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right pe-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedImages.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="ps-4">
                    <Avatar className="size-12 rounded-md">
                      <AvatarImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="rounded-md bg-muted">
                        <ImageIcon className="size-5" />
                      </AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground px-1.5"
                    >
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pe-4">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                            size="icon"
                          >
                            <EllipsisVertical />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem className="gap-2">
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="gap-2"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4">
            <p className="text-sm text-muted-foreground">
              Showing {paginatedImages.length} of {images.length} images
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
