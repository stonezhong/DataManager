import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Button from 'react-bootstrap/Button'

import {DatalakeEditor, SubscriptionTable} from '/components/business/datalake'
import {TopMessage} from '/components/generic/top_message/main.jsx'
import {PageHeader} from '/components/generic/page_tools'

import $ from 'jquery'
const buildUrl = require('build-url');
import {saveTenant, getUserTenantSubscriptions} from '/apis'

import {get_csrf_token, get_current_user, handle_json_response} from '/common_lib'

class DatalakePage extends React.Component {
    theTopMessageRef        = React.createRef();
    theDatalakeEditorRef    = React.createRef();
    theSubscriptionTableRef = React.createRef();

    onSave = (mode, tenant) => {
        return saveTenant(
            get_csrf_token(), mode, tenant
        ).then(this.theSubscriptionTableRef.current.refresh)
    };

    get_page = (offset, limit, filter={}) => getUserTenantSubscriptions(
        offset, limit
    );


    render() {
        return (
            <Container fluid>
                <Row>
                    <Col>
                        <TopMessage ref={this.theTopMessageRef} />
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <PageHeader title="Datalake">
                            {
                                !!this.props.current_user &&
                                <Button
                                    size="sm"
                                    className="c-vc ml-2"
                                    onClick={() => {
                                        this.theDatalakeEditorRef.current.openDialog({mode: "new"});
                                    }}
                                >
                                    Create
                                </Button>
                            }
                        </PageHeader>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <SubscriptionTable
                            ref={this.theSubscriptionTableRef}
                            csrf_token={get_csrf_token()}
                            get_page={this.get_page}
                            page_size={15}
                            size="sm"
                        />
                    </Col>
                </Row>

                <DatalakeEditor
                    ref={this.theDatalakeEditorRef}
                    onSave={this.onSave}
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()

    ReactDOM.render(
        <DatalakePage
            current_user={current_user}
        />,
        document.getElementById('app')
    );
});
