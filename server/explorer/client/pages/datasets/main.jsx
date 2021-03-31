import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Form from 'react-bootstrap/Form'
import {PageHeader} from '/components/generic/page_tools'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user, get_tenant_id, handle_json_response} from '/common_lib'
import {saveDataset} from '/apis'
import {DatasetTable} from '/components/business/dataset/dataset_table.jsx'
import {DatasetEditor} from '/components/business/dataset/dataset_editor.jsx'

class DatasetsPage extends React.Component {
    theDatasetEditorRef = React.createRef();
    theDatasetTableRef  = React.createRef();

    state = {
        datasets: [],
        showExpired: false
    };

    onSave = (mode, dataset) => {
        return saveDataset(
            get_csrf_token(),
            this.props.tenant_id,
            mode,
            dataset
        ).then(this.theDatasetTableRef.current.refresh);
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Datasets/",
            queryParams: {
                tenant_id: this.props.tenant_id,
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
                <Row>
                    <Col>
                        <PageHeader title="Datasets">
                            {!!this.props.current_user &&
                                <Button
                                    size="sm"
                                    className="ml-2"
                                    onClick={() => {
                                        this.theDatasetEditorRef.current.openDialog({
                                            mode: "new",
                                        });
                                    }}
                                >
                                    Create
                                </Button>
                            }
                            <Form.Check type="checkbox" label="Show Expired Datasets"
                                inline
                                className="ml-2"
                                checked={this.state.showExpired}
                                onChange={(event) => {
                                    this.setState(
                                        {showExpired: event.target.checked},
                                        this.theDatasetTableRef.current.reset
                                    )
                                }}
                            />
                        </PageHeader>
                    </Col>
                </Row>
                <Row>
                    <Col>
                        <DatasetTable
                            tenant_id={this.props.tenant_id}
                            ref={this.theDatasetTableRef}
                            showExpired={this.state.showExpired}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>
                <DatasetEditor
                    ref={this.theDatasetEditorRef}
                    onSave={this.onSave}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user();
    const tenant_id = get_tenant_id();

    ReactDOM.render(
        <DatasetsPage
            current_user={current_user}
            tenant_id={tenant_id}
        />,
        document.getElementById('app')
    );
});
