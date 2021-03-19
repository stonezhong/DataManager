import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import Tabs from 'react-bootstrap/Tabs'
import Tab from 'react-bootstrap/Tab'

import * as Icon from 'react-bootstrap-icons'
import { v4 as uuidv4 } from 'uuid';

import {bless_modal} from '/common_lib'

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
                register_dataset_instance: '',
                data_time: '',
            },
            _toAddAlias: '',
            _toAddAssertPath: ''
        }
    };

    modal_id = uuidv4();

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
                    register_dataset_instance: '',
                    data_time: ''
                };
            }
            this.setState({
                show: true,
                mode: mode,
                step: myStep
            }, () => bless_modal(this.modal_id))
        } else {
            this.setState({
                show: true,
                mode: mode,
                step: this.initStepValue()
            }, () => bless_modal(this.modal_id))
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
                scrollable
                animation={false}
                dialogClassName="standard-modal sql-step-editor"
                data-modal-id={this.modal_id}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <Tabs
                            defaultActiveKey="BasicInfo"
                            transition={false}
                        >
                            <Tab eventKey="BasicInfo" title="Basic Info">
                                <Container fluid className="pt-2">
                                    <Row>
                                        <Col>
                                            <Form.Group as={Row} controlId="sql-step-name">
                                                <Form.Label column sm={2}>Name</Form.Label>
                                                <Col sm={10}>
                                                    <Form.Control
                                                        size="sm"
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
                                            <h4>Import Asserts</h4>
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
                                                                size="sm"
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
                                                                size="sm"
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
                                            <Form.Group as={Row} controlId="sql-step-output-alias">
                                                <Form.Label column sm={4}>Output alias</Form.Label>
                                                <Col sm={8}>
                                                    <Form.Control
                                                        size="sm"
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
                                        <Col>
                                            <Form.Group as={Row} controlId="save-to-file">
                                                <Form.Label column sm={4}>Write Output</Form.Label>
                                                <Col sm={8}>
                                                    <Form.Check
                                                        size="sm"
                                                        className="c-vc"
                                                        type="checkbox"
                                                        disabled = {this.state.mode==="view"}
                                                        checked={this.state.step._output}
                                                        onChange={(event) => {
                                                            const v = event.target.checked;
                                                            this.setState(
                                                                state => {
                                                                    state.step._output = v;
                                                                    return state;
                                                                }
                                                            )
                                                        }}
                                                    />
                                                </Col>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    {
                                        this.state.step._output &&
                                        <Row>
                                            <Col>
                                                <fieldset class="border p-2">
                                                    <legend  class="w-auto">Write Output</legend>
                                                    <Row>
                                                        <Col>
                                                            <Form.Group as={Row} controlId="sql-step-output-location">
                                                                <Form.Label column sm={3}>Location</Form.Label>
                                                                <Col sm={9}>
                                                                    <Form.Control
                                                                        size="sm"
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
                                                        <Col>
                                                            <Form.Group as={Row} controlId="sql-step-output-dataset-name">
                                                                <Form.Label column sm={3}>Asset Path</Form.Label>
                                                                <Col sm={9}>
                                                                    <Form.Control
                                                                        size="sm"
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
                                                    <Row>
                                                        <Col>
                                                            <Form.Group as={Row} controlId="sql-step-output-type">
                                                                <Form.Label column sm={3}>Type</Form.Label>
                                                                <Col sm={9}>
                                                                    <Form.Control
                                                                        size="sm"
                                                                        as="select"
                                                                        disabled = {this.state.mode==='view'}
                                                                        value={this.state.step.output.type}
                                                                        onChange={(event) => {
                                                                            const v = event.target.value;
                                                                            this.setState(state => {
                                                                                state.step.output.type = v;
                                                                                return state;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <option key="parquet" value="parquet">parquet</option>
                                                                        <option key="json"    value="json">json</option>
                                                                    </Form.Control>
                                                                </Col>
                                                            </Form.Group>
                                                        </Col>
                                                        <Col>
                                                            <Form.Group as={Row} controlId="sql-step-output-write-mode">
                                                                <Form.Label column sm={3}>Write Mode</Form.Label>
                                                                <Col sm={9}>
                                                                    <Form.Control
                                                                        size="sm"
                                                                        as="select"
                                                                        disabled = {this.state.mode==='view'}
                                                                        value={this.state.step.output.write_mode}
                                                                        onChange={(event) => {
                                                                            const v = event.target.value;
                                                                            this.setState(state => {
                                                                                state.step.output.write_mode = v;
                                                                                return state;
                                                                            });
                                                                        }}
                                                                    >
                                                                        <option key="overwrite" value="overwrite">overwrite</option>
                                                                        <option key="append"    value="append">append</option>
                                                                    </Form.Control>
                                                                </Col>
                                                            </Form.Group>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col></Col>
                                                        <Col>
                                                            <Form.Group as={Row} controlId="sql-step-output-data-time">
                                                                <Form.Label column sm={3}>Data Time</Form.Label>
                                                                <Col sm={9}>
                                                                    <Form.Control
                                                                        size="sm"
                                                                        disabled = {this.state.mode==='view'}
                                                                        value={this.state.step.output.data_time}
                                                                        onChange={(event) => {
                                                                            const v = event.target.value;
                                                                            this.setState(state => {
                                                                                state.step.output.data_time = v;
                                                                                return state;
                                                                            });
                                                                        }}
                                                                    />
                                                                </Col>
                                                            </Form.Group>
                                                        </Col>
                                                    </Row>
                                                </fieldset>
                                            </Col>
                                        </Row>
                                    }
                                </Container>
                            </Tab>
                            <Tab eventKey="SQLStmt" title="SQL Statement">
                                <Container fluid className="pt-2">
                                    <Row>
                                        <Col>
                                            <Form.Group controlId="sql-step-sql">
                                                <Form.Label>SQL Statement</Form.Label>
                                                <Form.Control as="textarea" rows="25"
                                                    size="sm"
                                                    className="monofont"
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
                                </Container>
                            </Tab>
                        </Tabs>
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
                            size="sm"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                        >
                            Save changes
                        </Button>
                    }
                    <Button variant="secondary" size="sm" onClick={this.onClose} className={"btn-rounded"}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}
