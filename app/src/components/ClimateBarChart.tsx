// src/components/ClimateBarChart.tsx
import {formatNum} from "../lib/formatNum";
import type {MonthValueType} from "../types/dataTypes";
import "./ClimateBarChart.scss";

interface Props {
    precipitation: MonthValueType;
    et0: MonthValueType;
}

// March (index 2) to October (index 9)
const IRRIGATION_MONTHS = [
    {index: 2, label: "Mär"},
    {index: 3, label: "Apr"},
    {index: 4, label: "Mai"},
    {index: 5, label: "Jun"},
    {index: 6, label: "Jul"},
    {index: 7, label: "Aug"},
    {index: 8, label: "Sep"},
    {index: 9, label: "Okt"},
];

export const ClimateBarChart = ({precipitation, et0}: Props) => {
    const values = IRRIGATION_MONTHS.map(({index, label}) => ({
        label,
        precip: precipitation[index] ?? 0,
        et0: et0[index] ?? 0,
    }));

    // Separate maxima for independent scaling
    const maxPrecip = Math.max(...values.map((v) => v.precip), 1);
    const maxEt0 = Math.max(...values.map((v) => v.et0), 1);
    const maxValue = Math.max(maxPrecip, maxEt0);
    const chartHeight = 60;

    const toHeightPrecip = (val: number) => Math.round((val / maxValue) * chartHeight);
    const toHeightEt0 = (val: number) => Math.round((val / maxValue) * chartHeight);

    return (
        <div className="climate-chart">
            <div className="climate-chart__legend">
                <span className="climate-chart__legend-item climate-chart__legend-item--precip">
                    Niederschlag
                </span>
                <span className="climate-chart__legend-item climate-chart__legend-item--et0">
                    ET₀
                </span>
            </div>

            <div className="climate-chart__bars">
                {values.map(({label, precip, et0: et0Val}) => (
                    <div key={label} className="climate-chart__group">
                        <div className="climate-chart__bar-pair">
                            <div
                                className="climate-chart__bar climate-chart__bar--precip"
                                style={{height: toHeightPrecip(precip)}}
                                title={`Niederschlag ${label}: ${formatNum(precip, 0)} mm`}
                            />
                            <div
                                className="climate-chart__bar climate-chart__bar--et0"
                                style={{height: toHeightEt0(et0Val)}}
                                title={`ET₀ ${label}: ${formatNum(et0Val, 0)} mm`}
                            />
                        </div>
                        <span className="climate-chart__label">{label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
