import { createContext, useContext } from "react";
import {
  useFormContext,
  useFormState,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = { name: TName };

export const FormFieldContext = createContext<FormFieldContextValue | null>(
  null,
);

type FormItemContextValue = {
  id: string;
  /** Whether a FormDescription is on screen for this item. */
  hasDescription: boolean;
  setHasDescription: (shown: boolean) => void;
};

export const FormItemContext = createContext<FormItemContextValue | null>(null);

export function useFormField() {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext?.name });

  if (fieldContext === null || itemContext === null) {
    throw new Error("useFormField must be used inside FormField and FormItem");
  }

  const fieldState = getFieldState(fieldContext.name, formState);
  const { id, hasDescription, setHasDescription } = itemContext;

  return {
    id,
    hasDescription,
    setHasDescription,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
}
