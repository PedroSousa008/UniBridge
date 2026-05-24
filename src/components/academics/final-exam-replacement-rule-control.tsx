'use client';

import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { FINAL_EXAM_REPLACEMENT_RULE_HELP } from '@/lib/academics/final-exam-replacement-rule';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function FinalExamReplacementRuleControl({
  enabled,
  disabled,
  onChange,
  className,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border border-border/80 bg-muted/30 px-4 py-3 space-y-2',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="final-exam-replacement-rule"
          className="mt-1 h-4 w-4 rounded border-border"
          checked={enabled}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="flex-1 min-w-0">
          <label
            htmlFor="final-exam-replacement-rule"
            className="text-sm font-medium cursor-pointer"
          >
            Apply Final Exam Grade Replacement Rule
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Optional. Only for Continuous Evaluation + Final Exam. Not required for all
            universities.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 px-2"
          onClick={() => setHelpOpen(true)}
          aria-label="How this rule works"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{FINAL_EXAM_REPLACEMENT_RULE_HELP.title}</DialogTitle>
            <DialogDescription>{FINAL_EXAM_REPLACEMENT_RULE_HELP.summary}</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            {FINAL_EXAM_REPLACEMENT_RULE_HELP.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Pass requirements</p>
            <p>Final exam ≥ 8.5 and final calculated grade ≥ 9.5. Continuous evaluation has no minimum.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
