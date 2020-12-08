import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'
import Modal from 'react-bootstrap/Modal'
import Card from 'react-bootstrap/Card'
import * as Icon from 'react-bootstrap-icons'

const buildUrl = require('build-url');

import {DatasetInstanceTable} from '/components/business/dataset/dataset_instance_table.jsx'
import {SchemaViewer, get_schema} from '/components/business/dataset/schema_viewer.jsx'
import {DatasetEditor} from '/components/business/dataset/dataset_editor.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

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
                        <h1 className="c-ib">
                            Dataset {this.props.dataset.name}:{this.props.dataset.major_version}:{this.props.dataset.minor_version}
                        </h1>
                        <div className="c-vc c-ib">
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
                        </div>
                    </Col>
                </Row>
                {this.state.show_details && <Row>
                    <Col xs={8}>
                        <Card border="success">
                            <Card.Body>
                            <div
                                dangerouslySetInnerHTML={{__html: this.props.dataset.description}}
                            ></div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={4}>
                        <Card border="success">
                            <Card.Body>
                                <Row>
                                    <Col xs={4}>name</Col>
                                    <Col>{this.props.dataset.name}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Major Version</Col>
                                    <Col>{this.props.dataset.major_version}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Minor Version</Col>
                                    <Col>{this.props.dataset.minor_version}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Author</Col>
                                    <Col>{this.props.dataset.author}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Team</Col>
                                    <Col>{this.props.dataset.team}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Publish Time</Col>
                                    <Col>{this.props.dataset.publish_time}</Col>
                                </Row>
                                <Row>
                                    <Col xs={4}>Expiration Time</Col>
                                    <Col>{this.props.dataset.expiration_time}</Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row> }
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
