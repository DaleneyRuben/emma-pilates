import { Slot } from "radix-ui";
import {
  useId,
  useLayoutEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
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
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export function FormItem({ className, ...props }: ComponentProps<"div">) {
  const id = useId();
  const [hasDescription, setHasDescription] = useState(false);

  return (
    <FormItemContext.Provider value={{ id, hasDescription, setHasDescription }}>
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
  const {
    error,
    hasDescription,
    formItemId,
    formDescriptionId,
    formMessageId,
  } = useFormField();
  // Only ids that are on screen: a description when one renders, the
  // message once there is an error.
  const describedBy = [
    hasDescription ? formDescriptionId : undefined,
    error === undefined ? undefined : formMessageId,
  ].filter((id) => id !== undefined);

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        describedBy.length === 0 ? undefined : describedBy.join(" ")
      }
      aria-invalid={error !== undefined}
      {...props}
    />
  );
}

export function FormDescription({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  const { formDescriptionId, setHasDescription } = useFormField();
  // A field without helper text has nothing to describe it before an error.
  const shown = children !== undefined && children !== null && children !== "";

  useLayoutEffect(() => {
    if (!shown) return undefined;
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [shown, setHasDescription]);

  if (!shown) {
    return null;
  }

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-ayuda text-texto-tenue", className)}
      {...props}
    >
      {children}
    </p>
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
