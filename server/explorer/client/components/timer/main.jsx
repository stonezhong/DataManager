import React from 'react'

import Button from 'react-bootstrap/Button'
import Container from 'react-bootstrap/Container'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import Form from 'react-bootstrap/Form'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import InputGroup from 'react-bootstrap/InputGroup'

import * as Icon from 'react-bootstrap-icons'

import "./timer.scss"
import {is_json_string, is_valid_datetime} from '/common_lib.js'
import {AlertBox} from '/components/alert/alert.jsx'

const _ = require('lodash');

function timer_native_to_ui(native_timer) {
    // this is a timer for pipeline
    const ui_timer = _.cloneDeep(native_timer);
    if (ui_timer.end_at === null) {
        ui_timer.end_at = '';
    }
    return ui_timer;
}

function timer_ui_to_native(ui_timer) {
    // this is a timer for pipeline
    const native_timer = _.cloneDeep(ui_timer);
    if (native_timer.end_at === '') {
        native_timer.end_at = null;
    }
    return native_timer;
}

/*********************************************************************************
 * Purpose: edit or view a timer, or create a new timer
 * TODO: pagination
 *
 * Props
 *     onSave   : a callback, will be called if user hit "save changes" button
 *                onSave(mode, timer) will be called, mode is either "new" or "edit"
 *
 */
export class TimerEditor extends React.Component {
    theAlertBoxRef  = React.createRef();

    initTimerValue = () => {
        return {
            name: '',
            description: '',
            team: '',
            paused: false,
            interval_unit: "DAY",
            interval_amount: 1,
            start_from: '2020-01-01 00:00:00',
            topic: 'pipeline',
            context: '{}',
            category: '',
            end_at: '',
        }
    };

    state = {
        show: false,
        mode: "new",
        timer: this.initTimerValue(),
    }

    onClose = () => {
        this.setState({show: false});
    };

    onSave = () => {
        if (!is_json_string(this.state.timer.context)) {
            this.theAlertBoxRef.current.show("Context must be a JSON string");
            return
        }
        if (!is_valid_datetime(this.state.timer.start_from, allow_empty=false)) {
            this.theAlertBoxRef.current.show("Start MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }
        if (!is_valid_datetime(this.state.timer.start_from, allow_empty=true)) {
            this.theAlertBoxRef.current.show("End MUST be in format YYYY-MM-DD HH:MM:SS, for example: 2020-10-03 00:00:00");
            return
        }

        const native_timer = timer_ui_to_native(this.state.timer);
        const mode = this.state.mode;
        this.setState({show: false}, () => {this.props.onSave(mode, native_timer)} );
    };

    openDialog = (mode, ui_timer) => {
        if (mode === "view" || mode === "edit") {
            this.setState({
                show: true,
                mode: mode,
                timer: _.cloneDeep(ui_timer)
            })
        } else if (mode === "new") {
            this.setState({
                show: true,
                mode: mode,
                timer: this.initTimerValue(),
            })
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    get_title = () => {
        if (this.state.mode === "new") {
            return "new Scheduler";
        } else if (this.state.mode === "edit") {
            return "edit Scheduler";
        } else if (this.state.mode === "view") {
            return "Scheduler"
        } else {
            // wrong parameter
            console.assert(false, "mode must be edit, view or new");
        }
    };

    canSave = () => {
        return (
            !!this.state.timer.name &&
            !!this.state.timer.team &&
            !!this.state.timer.category &&
            !!this.state.timer.start_from
        );
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
                    <Modal.Title>{this.get_title()}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Container fluid className="pb-2 mb-2">
                        <AlertBox ref={this.theAlertBoxRef}/>
                        <Form>
                            <Form.Group as={Row} controlId="name">
                                <Form.Label column sm={2}>Name</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='edit'||this.state.mode==='view'}
                                        value={this.state.timer.name}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.timer.name = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="description">
                                <Form.Label column sm={2}>Description</Form.Label>
                                <Col sm={10}>
                                    <Form.Control as="textarea" rows={3}
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.timer.description}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.timer.description = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="paused">
                                <Form.Label column sm={2}>Paused</Form.Label>
                                <Col sm={10}>
                                    <Form.Check type="checkbox"
                                        className="c-vc"
                                        disabled = {this.state.mode==='view'}
                                        checked={this.state.timer.paused}
                                        onChange={(event) => {
                                            const v = event.target.checked;
                                            this.setState(
                                                state => {
                                                    state.timer.paused = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="category">
                                <Form.Label column sm={2}>Category</Form.Label>
                                <Col sm={10}>
                                    <Form.Control
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.timer.category}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.timer.category = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Form.Group as={Row} controlId="context">
                                <Form.Label column sm={2}>Context</Form.Label>
                                <Col sm={10}>
                                    <Form.Control as="textarea" rows={3}
                                        className="monofont"
                                        disabled = {this.state.mode==='view'}
                                        value={this.state.timer.context}
                                        onChange={(event) => {
                                            const v = event.target.value;
                                            this.setState(
                                                state => {
                                                    state.timer.context = v;
                                                    return state;
                                                }
                                            )
                                        }}
                                    />
                                </Col>
                            </Form.Group>
                            <Row>
                                <Col>
                                    <Form.Group as={Row} controlId="author">
                                        <Form.Label column sm={2}>Author</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                className={this.state.mode==="new"?"d-none":"d-block"}
                                                disabled = {true}
                                                value={this.state.timer.author}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.timer.author = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group as={Row} controlId="team">
                                        <Form.Label column sm={2}>Team</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                disabled = {this.state.mode==='view'}
                                                value={this.state.timer.team}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.timer.team = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group as={Row} controlId="interval">
                                        <Form.Label column sm={2}>Interval</Form.Label>
                                        <Col sm={10}>
                                            <InputGroup className="mb-3">
                                                <Form.Control
                                                    disabled = {this.state.mode==='view'}
                                                    value={this.state.timer.interval_amount}
                                                    onChange={(event) => {
                                                        const v = event.target.value;
                                                        this.setState(
                                                            state => {
                                                                state.timer.interval_amount = parseInt(v);
                                                                return state;
                                                            }
                                                        )
                                                    }}
                                                />
                                                <Form.Control
                                                    as="select"
                                                    disabled = {this.state.mode==='view'}
                                                    value={this.state.timer.interval_unit}
                                                    onChange={event => {
                                                        const v = event.target.value;
                                                        this.setState(state => {
                                                            state.timer.interval_unit = v;
                                                            return state;
                                                        });
                                                    }}
                                                >
                                                    <option key="YEAR" value="YEAR">YEAR</option>
                                                    <option key="MONTH" value="MONTH">MONTH</option>
                                                    <option key="DAY" value="DAY">DAY</option>
                                                    <option key="HOUR" value="HOUR">HOUR</option>
                                                    <option key="MINUTE" value="MINUTE">MINUTE</option>
                                                    <option key="SECOND" value="SECOND">SECOND</option>
                                                </Form.Control>
                                            </InputGroup>
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col>
                                    <Form.Group as={Row} controlId="start_from">
                                        <Form.Label column sm={2}>Start</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                disabled = {this.state.mode==='view'}
                                                value={this.state.timer.start_from}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.timer.start_from = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                                <Col>
                                    <Form.Group as={Row} controlId="end_at">
                                        <Form.Label column sm={2}>End</Form.Label>
                                        <Col sm={10}>
                                            <Form.Control
                                                disabled = {this.state.mode==='view'}
                                                value={this.state.timer.end_at}
                                                onChange={(event) => {
                                                    const v = event.target.value;
                                                    this.setState(
                                                        state => {
                                                            state.timer.end_at = v;
                                                            return state;
                                                        }
                                                    )
                                                }}
                                            />
                                        </Col>
                                    </Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Container>
                </Modal.Body>
                <Modal.Footer>
                    {
                        (this.state.mode === "edit" || this.state.mode === "new") &&
                        <Button
                            variant="primary"
                            onClick={this.onSave}
                            disabled={!this.canSave()}
                        >
                            Save changes
                        </Button>
                    }
                    <Button variant="secondary" onClick={this.onClose}>Close</Button>
                </Modal.Footer>
            </Modal>
        );
    }

}

/*********************************************************************************
 * Purpose: Show list of timers
 * TODO: pagination
 *
 * Props
 *     timers   : a list of timers
 *     allowEdit: if True, user is allowed to edit timer.
 *     allowNew : if True, user is allowed to create new timer
 *     onSave   : a callback, called with user want to save or edit a timer
 *                onSave(mode, timer) is called, mode is either "new" or "edit"
 *
 */
export class TimerTable extends React.Component {
    theTimerEditorRef = React.createRef();

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Schedulers</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.theTimerEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        }
                    </Col>
                </Row>
                <Table hover className="timer-table">
                    <thead className="thead-dark">
                        <tr>
                            <th data-role='icons'></th>
                            <th data-role='name'>Name</th>
                            <th data-role='paused'>Paused</th>
                            <th data-role='category'>Category</th>
                            <th data-role='author'>Author</th>
                            <th data-role='team'>Team</th>
                            <th data-role='interval'>Interval</th>
                            <th data-role='start'>Start</th>
                        </tr>
                    </thead>
                    <tbody>
                    {
                        this.props.timers.map(timer_native_to_ui).map(ui_timer => {
                            return (
                                <tr key={ui_timer.id}>
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={
                                                event => {
                                                    this.theTimerEditorRef.current.openDialog(
                                                        this.props.allowEdit?"edit":"view", ui_timer
                                                    )
                                                }
                                            }
                                        >
                                            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
                                        </Button>
                                    </td>
                                    <td>{ui_timer.name}</td>
                                    <td>{ui_timer.paused?"yes":"no"}</td>
                                    <td>{ui_timer.category}</td>
                                    <td>{ui_timer.author}</td>
                                    <td>{ui_timer.team}</td>
                                    <td>{ui_timer.interval_amount} {ui_timer.interval_unit}</td>
                                    <td>{ui_timer.start_from}</td>
                                </tr>
                            )
                        })
                    }
                    </tbody>
                </Table>
                <TimerEditor
                    ref={this.theTimerEditorRef}
                    onSave={this.props.onSave}
                />
            </div>
        );
    }
}
