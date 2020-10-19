import React from 'react'
import ReactDOM from 'react-dom'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'
import Form from 'react-bootstrap/Form'
import * as Icon from 'react-bootstrap-icons'

import $ from 'jquery'
const buildUrl = require('build-url');

import {dt_2_utc_string, get_csrf_token, get_current_user} from '/common_lib'
import {DatasetEditor} from '/components/dataset_editor/dataset_editor.jsx'


class Datasets extends React.Component {
    state = {
        datasets: [],
        show_expired_datasets: false
    };

    constructor(props) {
        super();
        this.theDatasetEditorRef = React.createRef();
    }

    load_datasets = () => {
        const buildArgs = {
            path: "/api/Datasets/",
            queryParams: {
                ordering: '-publish_time',
            }
        };
        if (!this.state.show_expired_datasets) {
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

    onDatasetSaved = (mode, dataset) => {
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
                .then(
                    (result) => {
                        this.load_datasets();
                    }
                )
        }
    };

    componentDidMount() {
        this.load_datasets();
    }

    render() {
        return (
            <div>
                <Container fluid>
                    <Row>
                        <Col>
                            <h1 className="c-ib">Datasets</h1>
                            <div className="c-vc c-ib">
                                <Button
                                    disabled = {!this.props.current_user}
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                        this.theDatasetEditorRef.current.openDialog();
                                    }}
                                >
                                    Create
                                </Button>
                                <Form.Check type="checkbox" label="Show Expired Datasets"
                                    inline
                                    className="ml-2"
                                    checked={this.state.show_expired_datasets}
                                    onChange={(event) => {
                                        this.setState({
                                            show_expired_datasets: event.target.checked
                                        }, this.load_datasets);
                                    }}
                                />
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <Table hover size="sm" className="dataset-table">
                                <thead className="thead-dark">
                                    <tr>
                                        <th className="c-tc-icon1"></th>
                                        <th data-role='name'>Name</th>
                                        <th data-role='author'>Author</th>
                                        <th data-role='team'>Team</th>
                                        <th data-role='publish_time'>Published</th>
                                        <th data-role='expired_time'>Expired</th>
                                        <th data-role='major_version'>Major Version</th>
                                        <th data-role='minor_version'>Minor Version</th>
                                    </tr>
                                </thead>
                                <tbody>
                                {
                                    this.state.datasets.map((dataset) => {
                                        return (
                                            <tr key={dataset.id}>
                                                <td  className="align-middle">
                                                    <Button
                                                        disabled = {this.props.username == ''}
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={event => {
                                                            this.theDatasetEditorRef.current.openDialog(dataset);
                                                        }}
                                                    >
                                                        <Icon.Pencil />
                                                    </Button>
                                                </td>
                                                <td><a href={`dataset?id=${dataset.id}`}>{dataset.name}</a></td>
                                                <td>{dataset.author}</td>
                                                <td>{dataset.team}</td>
                                                <td>{dataset.publish_time}</td>
                                                <td>{dataset.expiration_time}</td>
                                                <td>{dataset.major_version}</td>
                                                <td>{dataset.minor_version}</td>
                                            </tr>
                                        )
                                    })
                                }
                                </tbody>
                            </Table>
                        </Col>
                    </Row>
                </Container>

                <DatasetEditor
                    ref={this.theDatasetEditorRef}
                    onSave={this.onDatasetSaved}
                />
            </div>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <Datasets current_user={current_user} />,
        document.getElementById('app')
    );
});
