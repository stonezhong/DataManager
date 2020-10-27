import React from 'react'

import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Container from 'react-bootstrap/Container'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: View a PipelineGroup
 *
 * Props
 *     mode          : one of "new", "edit" or "view"
 *     pipeline_group: The pipeline group to view or edit.
 *     onSave        : Called when user save a new pipeline group or update
 *                     existing one, onSave(mode, pipeline_group) is called
 *
 */
export class PipelineGroupEditor extends React.Component {
    initPipelineGroupValue = () => {
        return {
            name: '',
            created_time: '2020-01-01 00:00:00',
            category: '',
            context: '{}',
            finished: false,
            manual: true,
        }
    };

    state = {
        mode: "new",
        show: false,
        pipeline_group: this.initPipelineGroupValue()
    };

    onSave = () => {
        const savedPipelineGroup = _.cloneDeep(this.state.pipeline_group);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, savedPipelineGroup)});

    };

    openDialog = (mode, pipeline_group) => {
        if (mode == "view" || mode == "edit") {
            this.setState({
                mode: mode,
                show: true,
                pipeline_group: pipeline_group
            })
        } else if (mode == "new") {
            this.setState({
                mode: mode,
                show: true,
                pipeline_group: this.initPipelineGroupValue()
            })
        }
    };


    onClose = () => {
        this.setState({show: false});
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
                    <Modal.Title>
                        Execution
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                            <Row>
                                <Col>
                                    <Form.Group controlId="pipeline-group-name">
                                        <Form.Label>Name</Form.Label>
                                        <Form.Control
                                            value={this.state.pipeline_group.name}
                                            disabled={this.state.mode != "new"}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.name = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-group-created-time">
                                        <Form.Label>Created Time</Form.Label>
                                        <Form.Control
                                            className={this.state.mode=="new"?"d-none":"d-block"}
                                            value={this.state.pipeline_group.created_time}
                                            disabled={true}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.created_time = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                        <Form.Control
                                            className={this.state.mode!="new"?"d-none":"d-block"}
                                            value="current time"
                                            disabled={true}
                                        />
                                    </Form.Group>

                                </Col>
                                <Col xs={4}>
                                    <Form.Group controlId="pipeline-group-finished">
                                        <Form.Label>Finished</Form.Label>
                                        <Form.Control
                                            value={this.state.pipeline_group.finished?"Yes":"No"}
                                            disabled={true}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.finished = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col xs={4}>
                                <Form.Group controlId="pipeline-group-category">
                                        <Form.Label>Category</Form.Label>
                                        <Form.Control
                                            value={this.state.pipeline_group.category}
                                            disabled={this.state.mode != "new"}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.category = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="pipeline-group-context">
                                        <Form.Label>Context</Form.Label>
                                        <Form.Control as="textarea" rows="5"
                                            disabled={this.state.mode == "view"}
                                            value={this.state.pipeline_group.context}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.context = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                    <Button
                        variant="primary"
                        onClick={this.onSave}
                        className={this.state.mode == "view"?"d-none":"d-block"}
                    >
                        Save changes
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

