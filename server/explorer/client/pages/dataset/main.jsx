import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'

const buildUrl = require('build-url');

import {DatasetInstanceTable} from '/components/business/dataset/dataset_instance_table.jsx'
import {SchemaViewer, get_schema} from '/components/business/dataset/schema_viewer.jsx'
import {DatasetEditor} from '/components/business/dataset/dataset_editor.jsx'
import {DatasetViewer} from '/components/business/dataset/dataset_viewer.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'
import {PageHeader} from '/components/generic/page_tools'
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx'
import {DatasetSample, has_sample_data} from '/components/business/dataset/dataset_sample.jsx'

import {get_app_context, get_csrf_token, get_current_user, handle_json_response} from '/common_lib'
import {saveDataset} from '/apis'

class DatasetDescriptionDialog extends React.Component {
    state = {
        show: false,
        title: "",
        content: "",
        publish_line: "",
    };

    onClose = () => {
        this.setState({show: false});
    };

    openDialog = (title, publish_line, content) => {
        this.setState({
            show: true,
            title: title,
            content: content,
            publish_line: publish_line,
        })
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='lg'
                scrollable
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.state.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Row>
                            <Col>
                                <i>{this.state.publish_line}</i>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <div dangerouslySetInnerHTML={ {__html: this.state.content } }/>
                            </Col>
                        </Row>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

class DatasetPage extends React.Component {
    theTopMessageRef    = React.createRef();
    theHelpDialogBoxRef = React.createRef();
    theSchemaViewerRef  = React.createRef();
    theDatasetEditorRef = React.createRef();
    theSampleViewRef    = React.createRef();

    state = {
        show_details: false,
        dataset_instances: [],
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: `/api/Datasets/${this.props.dataset.id}/children/`,
            queryParams: {
                offset: offset,
                limit : limit,
            }
        };
        const url = buildUrl('', buildArgs);
        return fetch(url).then(handle_json_response);
    };

    saveDatasetAndRefresh = (mode, dataset) => {
        return saveDataset(get_csrf_token(), mode, dataset).then(() => {
            location.reload();
        });
    };

    onDelete = dataset_instance_id => {
        const url = `/api/DatasetInstances/${dataset_instance_id}/`;
        return fetch(url,{
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                }
            }
        ).then(handle_json_response);
    };

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <Row>
                    <Col>
                        <PageHeader title="Dataset">
                            <Button
                                className="ml-2"
                                variant="secondary"
                                size="sm"
                                onClick={event => {
                                    this.setState({show_details: !this.state.show_details})
                                }}
                            >
                                {this.state.show_details?"Hide details":"Show details"}
                            </Button>

                            {!!this.props.current_user &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={event => {
                                        this.theDatasetEditorRef.current.openDialog("edit", this.props.dataset);
                                    }}
                                >
                                    Edit
                                </Button>
                            }
                            {get_schema(this.props.dataset) && <Button
                                className="ml-2"
                                variant="secondary"
                                size="sm"
                                onClick={
                                    event => {
                                        this.theSchemaViewerRef.current.openDialog(
                                            get_schema(this.props.dataset)
                                        )
                                    }
                                }
                            >
                                Schema
                            </Button>}
                            {
                                has_sample_data(this.props.dataset) &&
                                <Button
                                    className="ml-2"
                                    variant="secondary"
                                    size="sm"
                                    onClick={
                                        event => {
                                            this.theSampleViewRef.current.openDialog(
                                                "Sample Data",
                                                <DatasetSample dataset={this.props.dataset} />
                                            );
                                        }
                                    }
                                >
                                    Sample Data
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>
                <DatasetViewer dataset={this.props.dataset} show={this.state.show_details} />
                <Row>
                    <Col>
                        <h2 className="c-ib">
                            Assets
                        </h2>
                    </Col>
                </Row>
                <DatasetInstanceTable
                    ds={this.props.dataset}
                    allowDelete={!!this.props.current_user}
                    onDelete={this.onDelete}
                    get_page = {this.get_page}
                    page_size={15}
                    size="sm"
                />
                <DatasetDescriptionDialog ref={this.theHelpDialogBoxRef}/>
                <SchemaViewer
                    ref={this.theSchemaViewerRef}
                />
                <DatasetEditor
                    ref={this.theDatasetEditorRef}
                    onSave={this.saveDatasetAndRefresh}
                />
                <SimpleDialogBox
                    ref={this.theSampleViewRef}
                    backdrop="static"
                    size='lg'
                    scrollable
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    const app_context = get_app_context();

    ReactDOM.render(
        <DatasetPage current_user={current_user} dataset={app_context.dataset} />,
        document.getElementById('app')
    );
});
