import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'

import * as Icon from 'react-bootstrap-icons'

const _ = require("lodash");

/*********************************************************************************
 * Purpose: Edit a SQL Step inside a Spark-SQL task
 *
 * Props
 *     onSave   : called when user hit "Save Changes", onSave(mode, step) is called.
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
            },
            _toAddAlias: '',
            _toAddAssertPath: ''
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
        const step = _.cloneDeep(this.state.step);
        delete step._toAddAlias;
        delete step._toAddAssertPath;
        if (!this.state.step._output) {
            delete step.output;
        }
        delete step._output;
        const mode = this.state.mode;

        this.setState({show: false}, () => {this.props.onSave(mode, step)});
    };

    onClose = () => {
        this.setState({show: false});
    };

    openDialog = (mode, step) => {
        if (mode === "view" || mode === "edit") {
            const myStep = _.cloneDeep(step);
            myStep._toAddAlias = '';
            myStep._toAddAssertPath = '';
            if ('output' in step) {
                myStep._output = true;
            } else {
                myStep._output = false;
                myStep.output = {
                    type: 'parquet',
                    write_mode: 'overwrite',
                    location: '',
                    register_dataset_instance: ''
                };
            }
            this.setState({
                show: true,
                mode: mode,
                step: myStep
            })
        } else {
            this.setState({
                show: true,
                mode: mode,
                step: this.initStepValue()
            })
        }
    };

    get_title = () => {
        if (this.state.mode === "new") {
            return "new SQL Step";
        } else if (this.state.mode === "edit") {
            return "edit SQL Step";
        } else if (this.state.mode === "view") {
            return "SQL Step"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    canSave = () => {
        return this.state.step.name;
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
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="p-2 m-2">
                        <Row>
                            <Col>
                                <Form.Group as={Row} controlId="sql-step-name">
                                    <Form.Label column sm={2}>Name</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            disabled = {this.state.mode==='edit'||this.state.mode==='view'}
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
                                                            disabled = {this.state.mode==='view'}
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
                                    {
                                        (this.state.mode === 'edit' || this.state.mode === 'new') &&
                                        <tr>
                                            <td className="align-middle">
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    disabled = {
                                                        !this.state.step._toAddAlias.trim() ||
                                                        !this.state.step._toAddAssertPath.trim()
                                                    }
                                                    onClick={() => {
                                                        this.setState(state => {
                                                            state.step.imports.push({
                                                                alias   : state.step._toAddAlias.trim(),
                                                                dsi_name: state.step._toAddAssertPath.trim(),
                                                            });
                                                            this.state.step._toAddAlias = '';
                                                            this.state.step._toAddAssertPath = '';
                                                            return state;
                                                        });
                                                    }}
                                                >
                                                    <Icon.Plus />
                                                </Button>
                                            </td>
                                            <td>
                                                <Form.Control id="task_step_alias_to_add"
                                                    value={this.state.step._toAddAlias}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState(state => {
                                                            state.step._toAddAlias = v;
                                                            return state;
                                                        })
                                                    }}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control id="task_step_dsi_name_to_add"
                                                    value={this.state.step._toAddAssertPath}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState(state => {
                                                            state.step._toAddAssertPath = v;
                                                            return state;
                                                        })
                                                    }}
                                                />
                                            </td>
                                        </tr>

                                    }
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group controlId="sql-step-sql">
                                    <Form.Label>SQL Statement</Form.Label>
                                    <Form.Control as="textarea" rows="5"
                                        disabled = {this.state.mode==='view'}
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
                                            disabled = {this.state.mode==='view'}
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
                                        disabled = {this.state.mode==='view'}
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
                                        disabled = {this.state.mode==='view'}
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
                        <Row>
                            <Col>
                                <Form.Group as={Row} controlId="sql-step-output-location">
                                    <Form.Label column sm={2}>Output Location</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
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
                        <Row>
                            <Col>
                                <Form.Group as={Row} controlId="sql-step-output-type">
                                    <Form.Label column sm={2}>Output Type</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
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
                        <Row>
                            <Col>
                                <Form.Group as={Row} controlId="sql-step-output-write-mode">
                                    <Form.Label column sm={2}>Output Write Mode</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
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
                        <Row>
                            <Col>
                                <Form.Group as={Row} controlId="sql-step-output-dataset-name">
                                    <Form.Label column sm={2}>Publish as Dataset Instance</Form.Label>
                                    <Col sm={10}>
                                        <Form.Control
                                            disabled = {this.state.mode==='view'}
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
                    </Container>
                </Modal.Body>

                <Modal.Footer>
                    {
                        (
                            this.state.mode === "edit" ||
                            this.state.mode === "new"
                        ) &&
                        <Button
                            variant="primary"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                        >
                            Save changes
                        </Button>
                    }
                    <Button variant="secondary" onClick={this.onClose} className={"btn-rounded"}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
