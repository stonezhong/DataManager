import React from 'react'

import Button from 'react-bootstrap/Button'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Table from 'react-bootstrap/Table'
import * as Icon from 'react-bootstrap-icons'

import {ApplicationEditor} from './application_editor.jsx'
import {DataTable} from '/components/generic/datatable/main.jsx'
import {SimpleDialogBox} from '/components/generic/dialogbox/simple.jsx'

import "./application.scss"

/*********************************************************************************
 * Purpose: Show list of applications
 * TODO: pagination
 *
 * Props
 *     applications : a list of applications
 *     allowEdit    : if True, user is allowed to edit application.
 *     allowNew     : if True, user is allowed to create new application
 *     onSave       : a callback, called with user want to save or edit
 *                    an application. onSave(mode, application) is called,
 *                    mode is either "new" or "edit"
 *
 */
export class ApplicationTable extends React.Component {
    theApplicationEditorRef = React.createRef();
    theDataTableRef     = React.createRef();
    theDialogBoxRef     = React.createRef();

    get_page = (offset, limit) => {
        return this.props.get_page(offset, limit, {});
    };

    render_tools = application =>
        <Button
            variant="secondary"
            size="sm"
            onClick={event => {
                this.theApplicationEditorRef.current.openDialog(
                    this.props.allowEdit?"edit":"view", application
                )
            }}
        >
            { this.props.allowEdit?<Icon.Pencil />:<Icon.Info />}
        </Button>;

    render_name = application => {
        return (
            <a
                href="#"
                onClick={
                    event => {
                        event.preventDefault();
                        this.theDialogBoxRef.current.openDialog(
                            application.name,
                            <code>{application.description}</code>
                        )
                    }
                }
            >
                {application.name}
            </a>
        );
    };

    columns = {
        tools:              {display: "", render_data: this.render_tools},
        name:               {display: "Name", render_data: this.render_name},
        author:             {display: "Author"},
        team:               {display: "Team"},
        retired:            {display: "Retired", render_data: application => application.retired?"Yes":"No"},
    };

    onSave = (mode, dataset) => {
        Promise.resolve(this.props.onSave(mode, dataset)).then(
            this.theDataTableRef.current.refresh
        );
    };

    render() {
        return (
            <div>
                <Row>
                    <Col>
                        <h1 className="c-ib">Applications</h1>
                        {
                            this.props.allowNew && <Button
                                size="sm"
                                className="c-vc ml-2"
                                onClick={() => {
                                    this.theApplicationEditorRef.current.openDialog("new");
                                }}
                            >
                                Create
                            </Button>
                        }
                    </Col>
                </Row>

                <DataTable
                    ref={this.theDataTableRef}
                    hover
                    bordered
                    className="application-table"
                    columns = {this.columns}
                    id_column = "id"
                    size = {this.props.size}
                    page_size={this.props.page_size}
                    fast_step_count={10}
                    get_page={this.get_page}
                />
                <ApplicationEditor
                    ref={this.theApplicationEditorRef}
                    onSave={this.onSave}
                />
                <SimpleDialogBox
                    ref={this.theDialogBoxRef}
                    backdrop="static"
                    size='lg'
                    scrollable
                />
            </div>
        )
    }
}

