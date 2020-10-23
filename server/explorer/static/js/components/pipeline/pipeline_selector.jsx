import React from 'react'

import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import Container from 'react-bootstrap/Container'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Select bunch of pipelines
 *
 * Props
 *     pipelines  : A list pipelines user can pick within the list.
 *     onSelect   : called when user hit "Save Changes", onSave(pipeline_ids) is called.
 *
 */
export class PipelineSelector extends React.Component {
    state = {
        show: false,
        pipelines: [],
        selected: new Set(),        // all the selected pipeline ids
    };

    onClose = () => {
        this.setState({show: false});
    };

    onSelect = () => {
        const pipeline_ids = [... this.state.selected ];
        if (pipeline_ids.length > 0) {
            this.setState({show: false}, () => {this.props.onSelect(pipeline_ids)});
        } else {
            this.setState({show: false});
        }
    };

    openDialog = (pipelines) => {
        this.setState({
            show: true,
            pipelines: pipelines,
            selected: new Set(),
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
                    <Modal.Title>
                        Select Pipelines
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Form>
                        {
                            this.state.pipelines.map(pipeline => {
                                return (
                                    <Form.Group as={Row} controlId={pipeline.id} key={pipeline.id}>
                                        <Col sm={1}>
                                            <Form.Check type="checkbox" className="c-vc"
                                                checked={this.state.selected.has(pipeline.id)}
                                                onChange={(event) => {
                                                    const v = event.target.checked;
                                                    if (v) {
                                                        this.setState(
                                                            state => {
                                                                state.selected.add(pipeline.id);
                                                                return state;
                                                            }
                                                        )
                                                    } else {
                                                        this.setState(
                                                            state => {
                                                                state.selected.delete(pipeline.id);
                                                                return state;
                                                            }
                                                        )
                                                    }
                                                }}
                                            />
                                        </Col>
                                        <Form.Label column>{pipeline.name}</Form.Label>
                                    </Form.Group>
                                );
                            })
                        }
                        </Form>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                    <Button variant="primary" onClick={this.onSelect}>Select</Button>
                </Modal.Footer>

            </Modal>
        );
    }
}
