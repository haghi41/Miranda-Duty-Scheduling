
import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
export function Calendar({ mode='multiple', selected, onSelect }: any) { return <DayPicker mode={mode} selected={selected} onSelect={onSelect} /> }
