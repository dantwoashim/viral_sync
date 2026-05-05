"use client";

import { Drawer } from "vaul";
import { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  snapPoints?: string[] | number[];
  activeSnapPoint?: string | number | null;
  setActiveSnapPoint?: (snapPoint: string | number | null) => void;
  dismissible?: boolean;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  snapPoints = ["0.4", "0.8", "1"],
  activeSnapPoint,
  setActiveSnapPoint,
  dismissible = true,
}: BottomSheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPoint}
      dismissible={dismissible}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity" />
        <Drawer.Content className="bg-[#111] border border-white/10 flex flex-col rounded-t-[32px] h-full mt-24 max-h-[96%] fixed bottom-0 left-0 right-0 z-50">
          <div className="p-4 bg-[#111] rounded-t-[32px] flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/20 mb-6" />
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
