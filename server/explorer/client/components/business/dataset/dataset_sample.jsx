import React from 'react'

export function has_sample_data(dataset) {
    let rows = [];
    try {
        rows = JSON.parse(dataset.sample_data);
        return (rows.length > 0);
    }
    catch(error) {
        // we will absorb error as if now rows are provided
        return false;
    }
}

export class DatasetSample extends React.Component {
    render() {
        let rows = [];
        try {
            rows = JSON.parse(this.props.dataset.sample_data);
        }
        catch(error) {
            // we will absorb error as if now rows are provided
        }

        return <div>
            { rows.map((row, index) => <pre key={index}>
                {
                    JSON.stringify(row, null, 2)
                }
            </pre>) }
        </div>;
    }
}