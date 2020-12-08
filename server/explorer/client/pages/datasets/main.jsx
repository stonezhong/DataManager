import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import $ from 'jquery'
const buildUrl = require('build-url');

import {dt_2_utc_string, get_csrf_token, get_current_user, handle_json_response} from '/common_lib'
import {saveDataset} from '/apis'
import {DatasetTable} from '/components/business/dataset/dataset_table.jsx'

class DatasetsPage extends React.Component {
    state = {
        datasets: [],
        showExpired: false
    };

    onSave = (mode, dataset) => saveDataset(get_csrf_token(), mode, dataset)




    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Datasets/",
            queryParams: {
                offset: offset,
                limit : limit,
                ordering: "-publish_time",
            }
        };
        if (!filter.showExpired) {
            buildArgs.queryParams.expiration_time__isnull="True"
        }
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);
    };

    render() {
        return (
            <Container fluid>
                <DatasetTable
                    allowNew={!!this.props.current_user}
                    onSave={this.onSave}
                    initShowExpired={false}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <DatasetsPage current_user={current_user} />,
        document.getElementById('app')
    );
});
