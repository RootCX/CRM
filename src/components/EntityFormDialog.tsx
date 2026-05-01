import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button, Label, FormField } from "@rootcx/ui";
import type { FieldDefinition } from "@rootcx/ui";
import { EntityTypeahead } from "./EntityTypeahead";
import type { EntityTypeaheadConfig } from "./EntityTypeahead";

export interface RelationFieldDefinition {
  name: string;
  label: string;
  type: "relation";
  required?: boolean;
  placeholder?: string;
  config: EntityTypeaheadConfig;
}

export type ExtendedFieldDefinition = FieldDefinition | RelationFieldDefinition;

interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: ExtendedFieldDefinition[];
  defaultValues?: object;
  onSubmit: (values: Record<string, unknown>) => Promise<void> | void;
  submitLabel?: string;
  destructive?: boolean;
}

export function EntityFormDialog({
  open, onOpenChange, title, description,
  fields, defaultValues, onSubmit, submitLabel, destructive,
}: EntityFormDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues((defaultValues as Record<string, unknown>) ?? {});
      setErrors({});
    }
  }, [open, defaultValues]);

  const handleChange = (name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    for (const field of fields) {
      if (field.required) {
        const v = values[field.name];
        if (v === undefined || v === null || v === "") {
          newErrors[field.name] = "Required";
        }
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {fields.map(field => (
            <div key={field.name} className="space-y-1.5">
              {field.type === "relation" ? (
                <>
                  <Label>{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</Label>
                  <EntityTypeahead
                    config={(field as RelationFieldDefinition).config}
                    value={values[field.name] as string | undefined}
                    onChange={v => handleChange(field.name, v)}
                    placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}…`}
                  />
                  {errors[field.name] && <p className="text-xs text-destructive">{errors[field.name]}</p>}
                </>
              ) : (
                <FormField
                  field={field as FieldDefinition}
                  value={values[field.name]}
                  onChange={v => handleChange(field.name, v)}
                  error={errors[field.name]}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={submitting}>
              {submitting ? "Saving…" : (submitLabel ?? "Save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
