"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GalleryCategory = {
  id: number;
  name: string;
};

const categories: GalleryCategory[] = [
  { id: 1, name: "Events" },
  { id: 2, name: "Campus" },
  { id: 3, name: "Academics" },
  { id: 4, name: "Sports" },
];

export default function GalleryCategoryPage() {
  const [categoryName, setCategoryName] = React.useState("");
  const [categoryList, setCategoryList] = React.useState<GalleryCategory[]>(categories);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName.trim()) {
      const newCategory: GalleryCategory = {
        id: categoryList.length + 1,
        name: categoryName.trim(),
      };
      setCategoryList([...categoryList, newCategory]);
      setCategoryName("");
    }
  };

  const handleDelete = (id: number) => {
    setCategoryList(categoryList.filter((cat) => cat.id !== id));
  };

  const handleEdit = (id: number) => {
    const category = categoryList.find((cat) => cat.id === id);
    if (category) {
      setCategoryName(category.name);
      handleDelete(id);
    }
  };

  return (
    <>
      <div className="sticky top-12 z-10 bg-background/40 backdrop-blur-md flex items-center justify-between px-4 md:px-6 py-3 border-b">
        <h1 className="text-xl font-semibold">Gallery Categories</h1>
      </div>
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left side - Table */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="ps-4">Category Name</TableHead>
                    <TableHead className="text-right pe-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No categories found
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryList.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="ps-4 font-medium">{category.name}</TableCell>
                        <TableCell className="text-right pe-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(category.id)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Right side - Create Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Create Gallery Category</CardTitle>
                <CardDescription>Add a new category for gallery items</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      placeholder="Enter category name"
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

