import React from 'react';

import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';

import { v4 as uuidv4 } from 'uuid';

import {bless_modal, is_valid_datetime} from '/common_lib';

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
            due: '2020-01-01 00:00:00',
            category: '',
            context: '{}',
            finished: false,
            manual: true,
            _finished: false,
        }
    };

    modal_id = uuidv4();

    state = {
        mode: "new",
        show: false,
        pipeline_group: this.initPipelineGroupValue()
    };

    onSave = () => {
        const savedPipelineGroup = _.cloneDeep(this.state.pipeline_group);
        savedPipelineGroup.finished = savedPipelineGroup._finished;
        delete savedPipelineGroup._finished;
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, savedPipelineGroup)});

    };

    canSave = () => {
        return is_valid_datetime(this.state.pipeline_group.due);
    };

    openDialog = (mode, pipeline_group) => {
        if (mode == "view" || mode == "edit") {
            const ui_pipeline_group = _.cloneDeep(pipeline_group);
            ui_pipeline_group._finished = pipeline_group.finished;
                this.setState({
                mode: mode,
                show: true,
                pipeline_group: ui_pipeline_group
            }, () => bless_modal(this.modal_id))
        } else if (mode == "new") {
            this.setState({
                mode: mode,
                show: true,
                pipeline_group: this.initPipelineGroupValue()
            }, () => bless_modal(this.modal_id))
        }
    };


    onClose = () => {
        this.setState({show: false});
    };

    canEditFinish = () => {
        if (this.state.mode === 'view' || this.state.mode === "new") {
            // you cannot edit it in "view" mode
            // in new mode, it should always be "unfinished", still not editable
            return false;
        }
        if (this.state.pipeline_group.finished) {
            // you cannot change it since it is finished
            return false;
        }
        if (!this.state.pipeline_group.manual) {
            // you cannot change the finish status for an auto generated pipeline group
            return false;
        }
        return true;
    };

    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                scrollable
                animation={false}
                dialogClassName="standard-modal pipeline-group-editor-modal"
                data-modal-id={this.modal_id}
            >
                <Modal.Header closeButton>
                    <Modal.Title>Execution</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                            <Form.Row>
                                <Form.Group as={Col} controlId="pipeline-group-name">
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        value={this.state.pipeline_group.name}
                                        disabled={this.state.mode !== "new"}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.pipeline_group.name = v;
                                                return state;
                                            });
                                        }}
                                    />
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Form.Group as={Col} controlId="pipeline-group-due">
                                    <Form.Label>Due</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            value={this.state.pipeline_group.due}
                                            disabled={this.state.mode !== "new"}
                                            isInvalid={!is_valid_datetime(this.state.pipeline_group.due)}
                                            placeholder="YYYY-mm-dd HH:MM:SS"
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState( state => {
                                                    state.pipeline_group.due = v;
                                                    return state;
                                                });
                                            }}
                                        />
                                        <Form.Control.Feedback type="invalid">
                                            Not a valid date time format
                                        </Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group as={Col} controlId="pipeline-group-finished">
                                    <Form.Label>Finished</Form.Label>
                                    <Form.Check type="checkbox"
                                        disabled = {!this.canEditFinish()}
                                        checked={this.state.pipeline_group._finished}
                                        onChange={(event) => {
                                            const v = event.target.checked;
                                            this.setState(
                                                state => {
                                                    state.pipeline_group._finished = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Form.Group>
                                <Form.Group as={Col} controlId="pipeline-group-category">
                                    <Form.Label>Category</Form.Label>
                                    <Form.Control
                                        size="sm"
                                        value={this.state.pipeline_group.category}
                                        disabled={this.state.mode !== "new"}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState( state => {
                                                state.pipeline_group.category = v;
                                                return state;
                                            });
                                        }}
                                    />
                                </Form.Group>
                                <Form.Group as={Col} controlId="pipeline-group-created-time">
                                    <Form.Label>Created Time</Form.Label>
                                        <Form.Control
                                            size="sm"
                                            value={
                                                (this.state.mode==="new")?"current time":this.state.pipeline_group.created_time
                                            }
                                            disabled={true}
                                        />
                                </Form.Group>
                            </Form.Row>
                            <Form.Row>
                                <Form.Group as={Col} controlId="pipeline-group-context">
                                    <Form.Label>Context</Form.Label>
                                    <Form.Control as="textarea" rows="5"
                                        className="monofont"
                                        disabled={this.state.mode === "view"}
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
                            </Form.Row>
                        </Form>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={this.onClose}
                    >
                        Close
                    </Button>
                    {
                        (this.state.mode !== "view") && <Button
                            size="sm"
                            variant="primary"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                        >
                            Save changes
                        </Button>
                    }
                </Modal.Footer>
            </Modal>
        );
    }
}

