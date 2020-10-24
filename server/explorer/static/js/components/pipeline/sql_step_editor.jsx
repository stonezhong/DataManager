import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import classNames from 'classnames'
import * as Icon from 'react-bootstrap-icons'

/*********************************************************************************
 * Purpose: Edit a SQL Step inside a Spark-SQL task
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(step) is called.
 *     onCancel : called when user hit "Close" or close the dialog without save the change
 *
 */

export class SQLStepEditor extends React.Component {
    initStepValue = () => {
        return {
            name: '',
            imports: [],        // bunch of imports, e.g. [{dataset_instance: "foo.bar:1.0:1/2020-09-16", alias: "a"}]
            sql: '',
            alias: '',          // output the dataframe as an alias
            _output: false,     // do we want to write the query result?
            output: {
                type: 'parquet',
                write_mode: 'overwrite',
                location: '',
                register_dataset_instance: ''
            }
        }
    };

    state = {
        show: false,
        mode: "new",      // either edit or new
        step: this.initStepValue(),
    };

    deleteImport = alias => {
        const new_imports = this.state.step.imports.filter(x => x.alias != alias);
        this.setState(state => {
            state.step.imports = new_imports;
            return state;
        });
    };

    onSave = () => {
        const step = {
            name: this.state.step.name,
            imports: this.state.step.imports,
            sql: this.state.step.sql,
            alias: this.state.step.alias,
        };
        if (this.state.step._output) {
            step.output = this.state.step.output;
        }

        this.setState({show: false}, () => {this.props.onSave(step)});
    };

    onClose = () => {
        if (this.props.onCancel) {
            this.setState({show: false}, this.props.onCancel);
        } else {
            this.setState({show: false});
        }
    };

    openDialog = (step) => {
        if (step) {
            if ('output' in step) {
                this.setState({
                    show: true,
                    mode: 'edit',
                    step: {
                        name    : step.name,
                        imports : step.imports,
                        sql     : step.sql,
                        alias   : step.alias,
                        _output : true,
                        output  : step.output,
                    },
                })
            } else {
                this.setState({
                    show: true,
                    mode: 'edit',
                    step: {
                        name    : step.name,
                        imports : step.imports,
                        sql     : step.sql,
                        alias   : step.alias,
                        _output : false,
                        output  : {
                            type: 'parquet',
                            write_mode: 'overwrite',
                            location: '',
                            register_dataset_instance: ''
                        },
                    },
                })
            }
        } else {
            this.setState({
                show: true,
                mode: 'new',
                step: this.initStepValue()
            })
        }
    };


    render() {
        return (
            <Modal
                show={this.state.show}
                onHide={this.onClose}
                backdrop="static"
                size='xl'
                scrollable
            >

                <Modal.Header closeButton>
                    <Modal.Title>
                        {this.state.mode=="edit"?"Edit SQL Step":"New SQL Step"}
                    </Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="p-2 m-2">
                        <div className={this.state.show?"d-block":"d-none"}>
                            <Row>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-name">
                                        <Form.Label column sm={2}>Step name</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                disabled = {this.state.mode=='edit'}
                                                value={this.state.step.name}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.name = v;
                                                        return state;
                                                    })
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <h3>Import Asserts</h3>
                                    <Table hover bordered variant="dark" size="sm">
                                            <thead>
                                                <tr>
                                                    <th className="c-tc-icon1"></th>
                                                    <th style={{width: "200px"}}>Alias</th>
                                                    <th>Assert path</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                            {
                                                this.state.step.imports.map((imp) => {
                                                    return (
                                                        <tr key={imp.alias}>
                                                            <td className="align-middle">
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => {this.deleteImport(imp.alias)}}
                                                                >
                                                                    <Icon.X />
                                                                </Button>
                                                            </td>
                                                            <td className="align-middle">{imp.alias}</td>
                                                            <td className="align-middle">{imp.dsi_name}</td>
                                                        </tr>
                                                    )
                                                })
                                            }
                                            <tr>
                                                <td className="align-middle">
                                                    <Button
                                                        variant="primary"
                                                        size="sm"
                                                        onClick={() => {
                                                            this.setState(state => {
                                                                state.step.imports.push({
                                                                    alias: $("#task_step_alias_to_add").val(),
                                                                    dsi_name: $("#task_step_dsi_name_to_add").val()
                                                                });
                                                                $("#task_step_alias_to_add").val('')
                                                                $("#task_step_dsi_name_to_add").val('')
                                                                return state;
                                                            });
                                                        }}
                                                    >
                                                        <Icon.Plus />
                                                    </Button>
                                                </td>
                                                <td>
                                                    <Form.Control id="task_step_alias_to_add" />
                                                </td>
                                                <td>
                                                    <Form.Control id="task_step_dsi_name_to_add" />
                                                </td>
                                            </tr>
                                            </tbody>
                                    </Table>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="sql-step-sql">
                                        <Form.Label>SQL Statement</Form.Label>
                                        <Form.Control as="textarea" rows="5"
                                            value={this.state.step.sql}
                                            onChange={(event) => {
                                                const v = event.target.value;
                                                this.setState(state => {
                                                    state.step.sql = v;
                                                    return state;
                                                })
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-alias">
                                        <Form.Label column sm={2}>Output alias</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                value={this.state.step.alias}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.alias = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group controlId="save-to-file">
                                        <Form.Check
                                            name="save-output"
                                            inline
                                            label="Save result"
                                            type="radio"
                                            checked={this.state.step._output}
                                            onChange={() => {
                                                this.setState(state => {
                                                    state.step._output = true;
                                                    return state;
                                                })
                                            }}
                                        />
                                        <Form.Check
                                            name="save-output"
                                            inline
                                            label="Do not save result"
                                            type="radio"
                                            checked={!this.state.step._output}
                                            onChange={() => {
                                                this.setState(state => {
                                                    state.step._output = false;
                                                    return state;
                                                })
                                            }}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className={this.state.step._output?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-location">
                                        <Form.Label column sm={2}>Output Location</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                value={this.state.step.output.location}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.output.location = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className={this.state.step._output?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-type">
                                        <Form.Label column sm={2}>Output Type</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                value={this.state.step.output.type}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.output.type = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className={this.state.step._output?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-write-mode">
                                        <Form.Label column sm={2}>Output Write Mode</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                value={this.state.step.output.write_mode}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.output.write_mode = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row className={this.state.step._output?"d-block":"d-none"}>
                                <Col>
                                    <Form.Group as={Row} controlId="sql-step-output-dataset-name">
                                        <Form.Label column sm={2}>Publish as Dataset Instance</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                value={this.state.step.output.register_dataset_instance}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(state => {
                                                        state.step.output.register_dataset_instance = v;
                                                        return state;
                                                    });
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </div>
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="secondary" onClick={this.onClose} className={"btn-rounded"}>Close</Button>
                    <Button variant="primary" onClick={this.onSave}>Save changes</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
