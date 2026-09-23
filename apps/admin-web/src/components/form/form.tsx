import { Slot } from "radix-ui";
import { useId, type ComponentProps, type ReactNode } from "react";
import {
  Controller,
  FormProvider,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { cn } from "../../lib/cn";
import { Label } from "../ui/label";
import {
  FormFieldContext,
  FormItemContext,
  useFormField,
} from "./form-context";

/**
 * ADR-0041: React Hook Form owns the field lifecycle and Zod validates on the
 * client; every field keeps a programmatic label plus description and error
 * associations, and failed submissions keep the Administrator's values.
 */
export const Form = FormProvider;

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  const id = useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("flex flex-col gap-1.5", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

export function FormLabel({
  className,
  ...props
}: ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={error !== undefined}
      className={cn(error !== undefined && "text-error-texto", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

export function FormControl(props: ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        error === undefined
          ? formDescriptionId
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={error !== undefined}
      {...props}
    />
  );
}

export function FormDescription({ className, ...props }: ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-ayuda text-texto-tenue", className)}
      {...props}
    />
  );
}

export function FormMessage({
  className,
  children,
  ...props
}: ComponentProps<"p"> & { children?: ReactNode }) {
  const { error, formMessageId } = useFormField();
  const body = error === undefined ? children : String(error.message ?? "");

  if (body === undefined || body === "") {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-ayuda text-error-texto", className)}
      {...props}
    >
      {body}
    </p>
  );
}
