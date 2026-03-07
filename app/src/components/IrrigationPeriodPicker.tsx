// src/components/IrrigationPeriodPicker.tsx
import {useState} from "react";
import type {IrrigationBound, IrrigationMonth, IrrigationPeriod, MonthPosition} from "../types/project";
import {MONTHS, POSITIONS, boundToLabel, isValidPeriod} from "../utils/irrigationPeriod";
import "./IrrigationPeriodPicker.scss";

interface Props {
    value?: IrrigationPeriod;
    onChange: (period: IrrigationPeriod) => void;
}

const BoundPicker = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: IrrigationBound;
    onChange: (b: IrrigationBound) => void;
}) => (
    <div className="bound-picker">
        <span className="bound-picker__label">{label}</span>
        <div className="bound-picker__selects">
            <select
                value={value.month}
                onChange={(e) => onChange({...value, month: Number(e.target.value) as IrrigationMonth})}
            >
                {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                ))}
            </select>
            <select
                value={value.position}
                onChange={(e) => onChange({...value, position: e.target.value as MonthPosition})}
            >
                {POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                ))}
            </select>
        </div>
    </div>
);

export const IrrigationPeriodPicker = ({value, onChange}: Props) => {
    const [from, setFrom] = useState<IrrigationBound>(
        value?.from ?? {month: 4, position: "full"}
    );
    const [to, setTo] = useState<IrrigationBound>(
        value?.to ?? {month: 9, position: "full"}
    );

    const valid = isValidPeriod(from, to);

    const handleFromChange = (b: IrrigationBound) => {
        setFrom(b);
        if (isValidPeriod(b, to)) onChange({from: b, to});
    };

    const handleToChange = (b: IrrigationBound) => {
        setTo(b);
        if (isValidPeriod(from, b)) onChange({from, to: b});
    };

    return (
        <div className="irrigation-period-picker">
            <BoundPicker label="Von" value={from} onChange={handleFromChange} />
            <BoundPicker label="Bis" value={to} onChange={handleToChange} />

            {valid ? (
                <p className="irrigation-period-picker__preview">
                    📅 {boundToLabel(from)} – {boundToLabel(to)}
                </p>
            ) : (
                <p className="irrigation-period-picker__error">
                    ⚠️ „Bis" muss nach „Von" liegen
                </p>
            )}
        </div>
    );
};
