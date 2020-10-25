import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import $ from 'jquery'
const buildUrl = require('build-url');

import {dt_2_utc_string, get_csrf_token, get_current_user, empty_str_2_null} from '/common_lib'
import {DatasetTable} from '/components/dataset/dataset_table.jsx'
import {TopMessage} from '/components/top_message/main.jsx'

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

            fetch('/api/Datasets/', {
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
                .then(
                    (result) => {
                        this.load_datasets();
                    }
                )
        } else if (mode == 'edit') {
            // You can only change description and team
            const to_patch = {
                description     : dataset.description,
                team            : dataset.team,
                expiration_time : empty_str_2_null(dataset.expiration_time),
            }
            fetch(`/api/Datasets/${dataset.id}/`, {
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
                .then(
                    (result) => {
                        this.load_datasets();
                    }
                )
        }
    };

    load_datasets = () => {
        const buildArgs = {
            path: "/api/Datasets/",
            queryParams: {
                ordering: '-publish_time',
            }
        };
        if (!this.state.showExpired) {
            buildArgs.queryParams.expiration_time__isnull="True"
        }
        const url = buildUrl('', buildArgs);

        fetch(url)
            .then(res => res.json())
            .then(
                (result) => {
                    this.setState({datasets: result})
                }
            )
    }


    componentDidMount() {
        this.load_datasets();
    }

    onShowExpiredChange = (showExpired) => {
        this.setState({showExpired: showExpired}, () => {
            this.load_datasets();
        });
    };

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <DatasetTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    datasets={this.state.datasets}
                    onSave={this.onSave}
                    showExpired={this.state.showExpired}
                    onShowExpiredChange={this.onShowExpiredChange}
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
