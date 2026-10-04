"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function MobileSheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: React.ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="mobile-sheet-overlay" />
    <Dialog.Content className="mobile-sheet">
      <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-slate-200" aria-hidden="true" />
      <Dialog.Title className="pr-9 text-xl font-bold text-slate-900">{title}</Dialog.Title>
      {description ? <Dialog.Description className="mt-2 text-sm leading-6 text-slate-500">{description}</Dialog.Description> : <Dialog.Description className="sr-only">รายละเอียดและตัวเลือกสำหรับ {title}</Dialog.Description>}
      <div className="mt-5">{children}</div>
      <Dialog.Close className="absolute right-4 top-5 flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-sky-50" aria-label="ปิด"><X className="h-5 w-5" /></Dialog.Close>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
