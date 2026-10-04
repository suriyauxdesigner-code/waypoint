"use client";

import * as React from "react";
import { toast } from "sonner";
import { Briefcase } from "lucide-react";
import { ResponsiveSheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useActiveTrip } from "@/lib/store/hooks";
import { updateTrip } from "@/lib/store/actions";
import { fmtLong, toMinutes } from "@/lib/calc/dates";
import type { WorkSchedule } from "@/lib/types";
import { WorkScheduleEditor } from "./work-schedule-editor";
import type { SheetRequest } from "./sheets-provider";

export function WorkSheet({
  open,
  onOpenChange,
  request,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  request: Extract<SheetRequest, { type: "work" }>;
}) {
  const trip = useActiveTrip();
  const [ws, setWs] = React.useState<WorkSchedule | null>(trip?.workSchedule ?? null);
  if (!trip || !ws) return null;
  const date = request.date;
  const dayOff = date ? ws.daysOff.includes(date) : false;

  const save = () => {
    if (ws.enabled && toMinutes(ws.end) <= toMinutes(ws.start)) {
      toast.error("Work must end after it starts");
      return;
    }
    if (ws.enabled && ws.days.length === 0) {
      toast.error("Pick at least one work day, or turn work off");
      return;
    }
    updateTrip(trip.id, { workSchedule: ws });
    toast.success("Work schedule saved");
    onOpenChange(false);
  };

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Work schedule"
      description="Protects work hours on your plan"
        icon={Briefcase}
        iconTone="accent"
      footer={
        <Button size="lg" className="lg:h-10" onClick={save}>
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-5">
        {date && ws.enabled && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3.5 py-3">
            <label htmlFor="ws-dayoff" className="text-[13px] font-medium">
              Day off on {fmtLong(date)}
              <span className="block text-[12px] font-normal text-muted-foreground">Leave, exams or a public holiday</span>
            </label>
            <Switch
              id="ws-dayoff"
              checked={dayOff}
              onCheckedChange={(c) =>
                setWs({ ...ws, daysOff: c ? [...ws.daysOff, date].sort() : ws.daysOff.filter((d) => d !== date) })
              }
            />
          </div>
        )}
        <WorkScheduleEditor value={ws} onChange={setWs} />
      </div>
    </ResponsiveSheet>
  );
}
