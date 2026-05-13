@extends('shopify-app::layouts.default')

@section('styles')
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx'])
    @inertiaHead
@endsection

@section('content')
    @inertia
@endsection

@section('scripts')
    @parent

    <ui-nav-menu>
        <a href="/" rel="home">Dashboard</a>
        <a href="/webhook-subscriptions" >Webhook Subscriptions</a>
         <a href="/webhook-events" >Webhook Events</a>
      
    </ui-nav-menu>
@endsection