import {cropNames} from "../constants/plantNames";
import {type CropAdditionalWater} from "../constants/soilConstants";
import {kwbvZoneNames, nFkweClassNames} from "../types/dataTypes";

export const PrintCropData = ({cropData}: {cropData: CropAdditionalWater;}) => <table>
    {
        kwbvZoneNames.map((kwbName) => <>
            <tr><td>KWB: {kwbName}</td></tr>
            <tr><th>Pflanze</th>
                {nFkweClassNames.map(name => <th key={name}>{name}</th>)}
            </tr>
            {
                cropNames.map((cropName) => <tr key={cropName}>
                    <td>{cropName}</td>
                    {
                        nFkweClassNames.map(nKfeName => <td key={nKfeName}>{cropData[kwbName][cropName][nKfeName][1]}-{cropData[kwbName][cropName][nKfeName][0]}</td>)
                    }
                </tr>)
            }
        </>)
    }
</table>;