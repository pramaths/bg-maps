import type {
  FieldTemplateProps,
  ObjectFieldTemplateProps,
  RJSFSchema,
  UiSchema,
  WidgetProps,
} from "@rjsf/utils"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function FieldErrorMessage({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null
  return (
    <div className="mt-1 space-y-1">
      {errors.map((e, idx) => (
        <p key={idx} className="text-xs text-destructive">
          {e}
        </p>
      ))}
    </div>
  )
}

function coerceEmptyToUndefined(value: unknown) {
  if (value === "") return undefined
  return value
}

export function ShadcnFieldTemplate(props: FieldTemplateProps) {
  const {
    id,
    classNames,
    label,
    required,
    description,
    errors,
    help,
    children,
  } = props

  const errorList = (errors as any)?.props?.errors as string[] | undefined

  return (
    <div className={cn("space-y-2", classNames)}>
      {label && (
        <div className="space-y-1">
          <Label htmlFor={id} className="block">
            {label}
            {required ? <span className="text-destructive"> *</span> : null}
          </Label>
          {description}
        </div>
      )}
      <div>{children}</div>
      <FieldErrorMessage errors={errorList} />
      {help}
    </div>
  )
}

export function ShadcnObjectFieldTemplate(props: ObjectFieldTemplateProps) {
  const { title, description, properties } = props

  return (
    <div className="space-y-4">
      {title ? (
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-none tracking-tight">
            {title}
          </h3>
          {description}
        </div>
      ) : null}
      <div className="space-y-4">
        {properties.map((p) => (
          <div key={p.name}>{p.content}</div>
        ))}
      </div>
    </div>
  )
}

export function ShadcnTextWidget(props: WidgetProps) {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    onChange,
    onBlur,
    onFocus,
    options,
    schema,
  } = props

  const inputType = (options as any)?.inputType || (schema as any)?.format

  return (
    <Input
      id={id}
      type={inputType === "email" ? "email" : inputType === "password" ? "password" : "text"}
      value={(value ?? "") as any}
      required={required}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      onChange={(e) => onChange(coerceEmptyToUndefined(e.target.value))}
      onBlur={(e) => onBlur && onBlur(id, e.target.value)}
      onFocus={(e) => onFocus && onFocus(id, e.target.value)}
      className="text-zinc-900 bg-white border-zinc-300 focus:border-blue-500 focus:ring-blue-500"
    />
  )
}

export function ShadcnNumberWidget(props: WidgetProps) {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    onChange,
    onBlur,
    onFocus,
  } = props

  return (
    <Input
      id={id}
      type="number"
      value={value ?? ""}
      required={required}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      onChange={(e) => onChange(coerceEmptyToUndefined(e.target.value))}
      onBlur={(e) => onBlur && onBlur(id, e.target.value)}
      onFocus={(e) => onFocus && onFocus(id, e.target.value)}
      className="text-zinc-900 bg-white border-zinc-300 focus:border-blue-500 focus:ring-blue-500"
    />
  )
}

export function ShadcnTextareaWidget(props: WidgetProps) {
  const {
    id,
    value,
    required,
    disabled,
    readonly,
    autofocus,
    onChange,
    onBlur,
    onFocus,
  } = props

  return (
    <Textarea
      id={id}
      value={(value ?? "") as any}
      required={required}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      onChange={(e) => onChange(coerceEmptyToUndefined(e.target.value))}
      onBlur={(e) => onBlur && onBlur(id, e.target.value)}
      onFocus={(e) => onFocus && onFocus(id, e.target.value)}
      className="text-zinc-900 bg-white border-zinc-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
    />
  )
}

export function ShadcnCheckboxWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, autofocus, onChange } = props

  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={Boolean(value)}
        disabled={disabled || readonly}
        autoFocus={autofocus}
        onChange={(e) => onChange(e.target.checked)}
      />
    </div>
  )
}

export function ShadcnSelectWidget(props: WidgetProps) {
  const { id, value, disabled, readonly, autofocus, onChange, options, placeholder } = props

  const enumOptions = ((options as any)?.enumOptions as Array<{ label: string; value: any }>) || []

  return (
    <Select
      id={id}
      value={value ?? ""}
      disabled={disabled || readonly}
      autoFocus={autofocus}
      onChange={(e) => onChange(coerceEmptyToUndefined(e.target.value))}
      className="text-zinc-900 bg-white border-zinc-300 focus:border-blue-500 focus:ring-blue-500 text-sm"
    >
      <option value="" disabled>
        {placeholder || "Select"}
      </option>
      {enumOptions.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  )
}

export function ShadcnSubmitButton(props: any) {
  const { uiSchema } = props
  const submitText = (uiSchema as UiSchema)?.["ui:submitButtonOptions"]?.submitText

  return (
    <Button type="submit" className="w-full">
      {submitText || "Submit"}
    </Button>
  )
}

export function ShadcnAddButton(props: any) {
  return (
    <Button type="button" variant="secondary" size="sm" {...props}>
      Add
    </Button>
  )
}

export function ShadcnRemoveButton(props: any) {
  return (
    <Button type="button" variant="destructive" size="sm" {...props}>
      Remove
    </Button>
  )
}

export function ShadcnMoveUpButton(props: any) {
  return (
    <Button type="button" variant="outline" size="sm" {...props}>
      Up
    </Button>
  )
}

export function ShadcnMoveDownButton(props: any) {
  return (
    <Button type="button" variant="outline" size="sm" {...props}>
      Down
    </Button>
  )
}

export const rjsfShadcnWidgets = {
  TextWidget: ShadcnTextWidget,
  EmailWidget: ShadcnTextWidget,
  PasswordWidget: ShadcnTextWidget,
  TextareaWidget: ShadcnTextareaWidget,
  NumberWidget: ShadcnNumberWidget,
  UpDownWidget: ShadcnNumberWidget,
  CheckboxWidget: ShadcnCheckboxWidget,
  SelectWidget: ShadcnSelectWidget,
}

export const rjsfShadcnTemplates = {
  FieldTemplate: ShadcnFieldTemplate,
  ObjectFieldTemplate: ShadcnObjectFieldTemplate,
  ButtonTemplates: {
    SubmitButton: ShadcnSubmitButton,
    AddButton: ShadcnAddButton,
    RemoveButton: ShadcnRemoveButton,
    MoveUpButton: ShadcnMoveUpButton,
    MoveDownButton: ShadcnMoveDownButton,
  },
}

export type RjsfShadcnFormProps = {
  jsonSchema: RJSFSchema
  uiSchema?: UiSchema
  onSubmit: (data: any) => void
  className?: string
}
