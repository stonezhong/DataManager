import React from 'react';

import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import {StandardDialogbox} from '/components/generic/dialogbox/standard.jsx';

const _ = require("lodash");

/*********************************************************************************
 * Purpose: View a PipelineGroup
 *
 * Props
 *     mode          : one of "new", "edit" or "view"
 *     pipeline_group: The pipeline group to view or edit.
 *
 */
export class PipelineGroupViewer extends StandardDialogbox {
    dialogClassName = "pipeline-group-editor-modal";

    hasSave = () => false;

    onOpen = (openArgs) => {
        const {pipeline_group} = openArgs;
        return {
            pipeline_group: pipeline_group
        }
    };

    getTitle = () => "Execution";

    renderBody = () => {
        const {pipeline_group} = this.state.payload;
        return (
            <Form>
                <Form.Row>
                    <Form.Group as={Col} controlId="pipeline-group-name">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                            size="sm"
                            value={pipeline_group.name}
                            disabled={true}
                        />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="pipeline-group-due">
                        <Form.Label>Due</Form.Label>
                            <Form.Control
                                size="sm"
                                value={pipeline_group.due}
                                disabled={true}
                            />
                    </Form.Group>
                    <Form.Group as={Col} controlId="pipeline-group-finished">
                        <Form.Label>Finished</Form.Label>
                        <Form.Check type="checkbox"
                            disabled = {true}
                            checked={pipeline_group.finished}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="pipeline-group-category">
                        <Form.Label>Category</Form.Label>
                        <Form.Control
                            size="sm"
                            value={pipeline_group.category}
                            disabled={true}
                        />
                    </Form.Group>
                    <Form.Group as={Col} controlId="pipeline-group-created-time">
                        <Form.Label>Created Time</Form.Label>
                            <Form.Control
                                size="sm"
                                value={pipeline_group.created_time}
                                disabled={true}
                            />
                    </Form.Group>
                </Form.Row>
                <Form.Row>
                    <Form.Group as={Col} controlId="pipeline-group-context">
                        <Form.Label>Context</Form.Label>
                        <Form.Control as="textarea" rows="5"
                            className="monofont"
                            disabled={true}
                            value={pipeline_group.context}
                        />
                    </Form.Group>
                </Form.Row>
            </Form>
        );
    }
}

