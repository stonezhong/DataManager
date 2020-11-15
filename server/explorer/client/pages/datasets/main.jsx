import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import $ from 'jquery'
const buildUrl = require('build-url');

import {dt_2_utc_string, get_csrf_token, get_current_user} from '/common_lib'
import {DatasetTable} from '/components/business/dataset/dataset_table.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

class DatasetsPage extends React.Component {
    theTopMessageRef = React.createRef();

    state = {
        datasets: [],
        showExpired: false
    };

    onSave = (mode, dataset) => {
        if (mode == "new") {
            // TODO: shuold not trust client side time
            const now = dt_2_utc_string(new Date());
            const to_post = {
                name            : dataset.name,
                major_version   : dataset.major_version,
                minor_version   : parseInt(dataset.minor_version),
                description     : dataset.description,
                team            : dataset.team,
                publish_time    : now,
            }

            return fetch('/api/Datasets/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            })
                .then((res) => res.json())
                .catch(() => {
                    this.theTopMessageRef.current.show("danger", "Unable to save!");
                })
        } else if (mode == 'edit') {
            // You can only change description and team
            const to_patch = {
                description     : dataset.description,
                team            : dataset.team,
                expiration_time : (dataset.expiration_time==='')?null:dataset.expiration_time
            }
            return fetch(`/api/Datasets/${dataset.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            })
                .then((res) => res.json())
                .catch(() => {
                    this.theTopMessageRef.current.show("danger", "Unable to save!");
                })
        }
    };


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
        return fetch(url).then(res => res.json());
    };

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <DatasetTable
                    allowEdit={!!this.props.current_user}
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
