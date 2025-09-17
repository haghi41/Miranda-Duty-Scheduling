
import * as React from 'react'
export function Select({ value, onValueChange, children }: any) { return <div data-select>{children}</div> }
export function SelectTrigger({ children }: any) { return <div>{children}</div> }
export function SelectValue({ placeholder }: { placeholder?: string }) { return <span>{placeholder}</span> }
export function SelectContent({ children }: any) { return <div>{children}</div> }
export function SelectItem({ value, children, onSelect }: any) { return <div onClick={()=>onSelect?.(value)}>{children}</div> }
