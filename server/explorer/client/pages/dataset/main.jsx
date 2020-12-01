import React from 'react'
import ReactDOM from 'react-dom'
import $ from 'jquery'

import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'
import Button from 'react-bootstrap/Button'
import * as Icon from 'react-bootstrap-icons'

const buildUrl = require('build-url');

import {DatasetInstanceTable} from '/components/business/dataset/dataset_instance_table.jsx'
import {TopMessage} from '/components/generic/top_message/main.jsx'

import {get_app_context, get_current_user, handle_json_response} from '/common_lib'
import Modal from 'react-bootstrap/esm/Modal'

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

    state = {
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

    render() {
        return (
            <Container fluid>
                <TopMessage ref={this.theTopMessageRef} />
                <Row>
                    <Col>
                        <h1 className="c-ib">
                            Assets for {this.props.dataset.name}:{this.props.dataset.major_version}:{this.props.dataset.minor_version}
                        </h1>
                        <Button
                            size="sm"
                            className="ml-2 c-vc c-ib"
                            onClick={event => {
                                this.theHelpDialogBoxRef.current.openDialog(
                                    `${this.props.dataset.name}:${this.props.dataset.major_version}:${this.props.dataset.minor_version}`,
                                    `Published by ${this.props.dataset.author} from ${this.props.dataset.team} team at ${this.props.dataset.publish_time}.`,
                                    this.props.dataset.description
                                );
                            }}
                        >
                            <Icon.Info />
                        </Button>
                    </Col>
                </Row>
                <DatasetInstanceTable
                    get_page = {this.get_page}
                    page_size={15}
                    size="sm"
                />
                <DatasetDescriptionDialog ref={this.theHelpDialogBoxRef}/>
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
