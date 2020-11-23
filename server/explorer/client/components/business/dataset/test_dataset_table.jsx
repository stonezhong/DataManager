import React from 'react'

import Container from 'react-bootstrap/Container'

import {DatasetTable} from './dataset_table.jsx'

import { v4 as uuidv4 } from 'uuid';
import { dt_2_utc_string } from '/common_lib';

const _ = require("lodash");

export class TestDatasetTable extends React.Component {
    theDatasetTableRef = React.createRef();

    testSchema = {
        "type": "struct",
        "fields": [
            {
                "name": "market",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "type",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "symbol",
                "type": "string",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "amount",
                "type": "long",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "price",
                "type": "double",
                "nullable": true,
                "metadata": {}
            },
            {
                "name": "commission",
                "type": "double",
                "nullable": true,
                "metadata": {}
            }
        ]
    };

    generate_dataset = idx => {
        return {
            author: 'stonezhong',
            description: 'Blah...',
            expiration_time: (idx <= 50)?"2020-11-17 07:07:21":null,
            id: uuidv4(),
            major_version: "1.0",
            minor_version: 1,
            name: `foo_${idx}`,
            publish_time: "2020-11-17 07:07:21",
            sample_data: "",
            schema: JSON.stringify(this.testSchema),
            team: "trading",
        }
    };

    testData = _.range(0, 400).map(this.generate_dataset);

    onSave = (mode, dataset) => {
        if (mode === "new") {
            const newDataset = _.cloneDeep(dataset);
            newDataset.id = uuidv4();
            newDataset.author = "stonezhong";
            newDataset.publish_time = dt_2_utc_string(new Date());
            this.testData.push(newDataset);
            return Promise.resolve(newDataset);
        }
        if (mode === "edit") {
            const idx = _.findIndex(this.testData, tmpDataset => tmpDataset.id === dataset.id);
            const newDataset = _.cloneDeep(dataset);
            this.testData[idx] = newDataset;
            return Promise.resolve(newDataset);
        }

    };

    get_page = (offset, limit, filter={}) => {
        var rows = this.testData;

        if (!filter.showExpired) {
            rows = _.filter(rows, dataset => _.isNull(dataset.expiration_time));
        }
        return {
            count: rows.length,
            results: rows.slice(offset, offset + limit)
        };
    };

    render() {
        return (
            <Container fluid>
                <h2>Test DatasetTable</h2>
                <DatasetTable
                    allowEdit={true}
                    allowNew={true}
                    onSave={this.onSave}
                    initShowExpired={false}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
                />
            </Container>
        );
    }
}
